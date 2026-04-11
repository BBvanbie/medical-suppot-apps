import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

import type { AuthenticatedUser } from "@/lib/authContext";
import { writeAuditLog } from "@/lib/auditLog";
import { db } from "@/lib/db";
import { ensureSecurityAuthSchema } from "@/lib/securityAuthSchema";

const MFA_CHALLENGE_TTL_MINUTES = 5;

type MfaCredentialRow = {
  id: number;
  credential_id: string;
  public_key: string;
  counter: string | number;
  transports: string[] | null;
  device_type: string | null;
  backed_up: boolean;
  name: string;
};

function getRpID(origin: string) {
  return new URL(origin).hostname;
}

function toBase64Url(value: Uint8Array) {
  return isoBase64URL.fromBuffer(value);
}

function fromBase64Url(value: string) {
  return isoBase64URL.toBuffer(value);
}

function getDisplayName(user: Pick<AuthenticatedUser, "username">) {
  return user.username;
}

export async function hasActiveMfaCredential(userId: number) {
  await ensureSecurityAuthSchema();
  const result = await db.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM user_mfa_credentials
        WHERE user_id = $1
          AND revoked_at IS NULL
      ) AS exists
    `,
    [userId],
  );
  return Boolean(result.rows[0]?.exists);
}

async function listActiveCredentials(userId: number) {
  await ensureSecurityAuthSchema();
  const result = await db.query<MfaCredentialRow>(
    `
      SELECT id, credential_id, public_key, counter, transports, device_type, backed_up, name
      FROM user_mfa_credentials
      WHERE user_id = $1
        AND revoked_at IS NULL
      ORDER BY created_at DESC
    `,
    [userId],
  );
  return result.rows;
}

async function saveChallenge(userId: number, purpose: "registration" | "authentication", challenge: string) {
  await ensureSecurityAuthSchema();
  await db.query(
    `
      INSERT INTO user_mfa_challenges (user_id, challenge, purpose, expires_at)
      VALUES ($1, $2, $3, NOW() + ($4::text || ' minutes')::interval)
    `,
    [userId, challenge, purpose, String(MFA_CHALLENGE_TTL_MINUTES)],
  );
}

async function consumeLatestChallenge(userId: number, purpose: "registration" | "authentication") {
  await ensureSecurityAuthSchema();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ id: number; challenge: string }>(
      `
        SELECT id, challenge
        FROM user_mfa_challenges
        WHERE user_id = $1
          AND purpose = $2
          AND consumed_at IS NULL
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [userId, purpose],
    );
    const row = result.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query(
      `
        UPDATE user_mfa_challenges
        SET consumed_at = NOW()
        WHERE id = $1
      `,
      [row.id],
    );
    await client.query("COMMIT");
    return row.challenge;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createMfaRegistrationOptions(user: AuthenticatedUser, origin: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const credentials = await listActiveCredentials(user.id);
  const options = await generateRegistrationOptions({
    rpName: "救急搬送支援システム",
    rpID: getRpID(origin),
    userID: String(user.id),
    userName: user.username,
    userDisplayName: getDisplayName(user),
    timeout: 60_000,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
    excludeCredentials: credentials.map((credential) => ({
      type: "public-key" as const,
      id: fromBase64Url(credential.credential_id),
      transports: credential.transports as never,
    })),
  });

  await saveChallenge(user.id, "registration", options.challenge);
  return options;
}

export async function verifyAndStoreMfaRegistration(input: {
  user: AuthenticatedUser;
  origin: string;
  response: RegistrationResponseJSON;
  credentialName?: string;
}) {
  const expectedChallenge = await consumeLatestChallenge(input.user.id, "registration");
  if (!expectedChallenge) {
    return { ok: false as const, message: "MFA 登録の有効期限が切れています。もう一度やり直してください。" };
  }

  const verification = await verifyRegistrationResponse({
    response: input.response,
    expectedChallenge,
    expectedOrigin: input.origin,
    expectedRPID: getRpID(input.origin),
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    await writeAuditLog({
      actor: input.user,
      action: "security.mfa.register.failure",
      targetType: "user",
      targetId: String(input.user.id),
      metadata: { reason: "verification_failed" },
    });
    return { ok: false as const, message: "MFA 登録に失敗しました。" };
  }

  const info = verification.registrationInfo;
  const credentialId = toBase64Url(info.credentialID);
  const publicKey = toBase64Url(info.credentialPublicKey);
  const credentialName = input.credentialName?.trim() || "WebAuthn credential";

  await db.query(
    `
      INSERT INTO user_mfa_credentials (
        user_id,
        credential_id,
        public_key,
        counter,
        transports,
        device_type,
        backed_up,
        name,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
      ON CONFLICT (credential_id)
      DO NOTHING
    `,
    [
      input.user.id,
      credentialId,
      publicKey,
      info.counter,
      JSON.stringify(input.response.response.transports ?? []),
      info.credentialDeviceType,
      info.credentialBackedUp,
      credentialName,
      input.user.id,
    ],
  );

  await writeAuditLog({
    actor: input.user,
    action: "security.mfa.register.success",
    targetType: "user",
    targetId: String(input.user.id),
    metadata: { credentialId, credentialName },
  });

  return { ok: true as const, credentialName };
}

export async function createMfaAuthenticationOptions(user: AuthenticatedUser, origin: string): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const credentials = await listActiveCredentials(user.id);
  const options = await generateAuthenticationOptions({
    rpID: getRpID(origin),
    timeout: 60_000,
    userVerification: "required",
    allowCredentials: credentials.map((credential) => ({
      type: "public-key" as const,
      id: fromBase64Url(credential.credential_id),
      transports: credential.transports as never,
    })),
  });

  await saveChallenge(user.id, "authentication", options.challenge);
  return options;
}

export async function verifyMfaAuthentication(input: {
  user: AuthenticatedUser;
  origin: string;
  response: AuthenticationResponseJSON;
}) {
  const expectedChallenge = await consumeLatestChallenge(input.user.id, "authentication");
  if (!expectedChallenge) {
    return { ok: false as const, message: "MFA 認証の有効期限が切れています。もう一度やり直してください。" };
  }

  const credential = await db.query<MfaCredentialRow>(
    `
      SELECT id, credential_id, public_key, counter, transports, device_type, backed_up, name
      FROM user_mfa_credentials
      WHERE user_id = $1
        AND credential_id = $2
        AND revoked_at IS NULL
      LIMIT 1
    `,
    [input.user.id, input.response.id],
  );
  const row = credential.rows[0];
  if (!row) {
    await writeAuditLog({
      actor: input.user,
      action: "security.mfa.authenticate.failure",
      targetType: "user",
      targetId: String(input.user.id),
      metadata: { reason: "credential_not_found" },
    });
    return { ok: false as const, message: "登録済みの MFA credential が見つかりません。" };
  }

  const verification = await verifyAuthenticationResponse({
    response: input.response,
    expectedChallenge,
    expectedOrigin: input.origin,
    expectedRPID: getRpID(input.origin),
    requireUserVerification: true,
    authenticator: {
      credentialID: fromBase64Url(row.credential_id),
      credentialPublicKey: fromBase64Url(row.public_key),
      counter: Number(row.counter),
      transports: row.transports as never,
    },
  });

  if (!verification.verified) {
    await writeAuditLog({
      actor: input.user,
      action: "security.mfa.authenticate.failure",
      targetType: "user",
      targetId: String(input.user.id),
      metadata: { credentialId: row.credential_id, reason: "verification_failed" },
    });
    return { ok: false as const, message: "MFA 認証に失敗しました。" };
  }

  await db.query(
    `
      UPDATE user_mfa_credentials
      SET counter = $2,
          last_used_at = NOW()
      WHERE id = $1
    `,
    [row.id, verification.authenticationInfo.newCounter],
  );

  await writeAuditLog({
    actor: input.user,
    action: "security.mfa.authenticate.success",
    targetType: "user",
    targetId: String(input.user.id),
    metadata: { credentialId: row.credential_id },
  });

  return { ok: true as const };
}
