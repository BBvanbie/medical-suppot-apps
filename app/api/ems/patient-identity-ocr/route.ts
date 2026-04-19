import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeEmsRoute } from "@/lib/routeAccess";
import { recordApiFailureEvent } from "@/lib/systemMonitor";

const execFileAsync = promisify(execFile);

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Set(["drivers_license", "my_number_card"]);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const OCR_SCRIPT_PATH = path.join(process.cwd(), "scripts", "ocr", "patient_identity_ocr.py");
const OCR_VENV_PYTHON_PATH = path.join(process.cwd(), ".venv-ocr", "Scripts", "python.exe");

type OcrBirthField = {
  westernYear: string;
  month: string;
  day: string;
};

type OcrResponsePayload = {
  ok: boolean;
  documentType: string;
  message?: string;
  debug?: string | null;
  fields: {
    name: string | null;
    address: string | null;
    birth: OcrBirthField | null;
  };
  warnings: string[];
};

function isFileLike(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

async function resolvePythonExecutable() {
  try {
    await fs.access(OCR_VENV_PYTHON_PATH);
    return OCR_VENV_PYTHON_PATH;
  } catch {
    return "python";
  }
}

export async function POST(request: Request) {
  let tempFilePath: string | null = null;

  try {
    const access = authorizeEmsRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

    const formData = await request.formData();
    const documentType = String(formData.get("documentType") ?? "").trim();
    const image = formData.get("image");

    if (!ALLOWED_DOCUMENT_TYPES.has(documentType)) {
      return NextResponse.json({ message: "対応していない書類種別です。" }, { status: 400 });
    }

    if (!isFileLike(image)) {
      return NextResponse.json({ message: "画像ファイルを選択してください。" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      return NextResponse.json({ message: "JPEG / PNG / WebP の画像を選択してください。" }, { status: 400 });
    }

    if (image.size <= 0 || image.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ message: "画像サイズは 8MB 以下にしてください。" }, { status: 400 });
    }

    const extension = image.type === "image/png" ? ".png" : image.type === "image/webp" ? ".webp" : ".jpg";
    tempFilePath = path.join(os.tmpdir(), `patient-identity-ocr-${randomUUID()}${extension}`);
    const bytes = Buffer.from(await image.arrayBuffer());
    await fs.writeFile(tempFilePath, bytes);

    const pythonExecutable = await resolvePythonExecutable();
    const { stdout, stderr } = await execFileAsync(pythonExecutable, [OCR_SCRIPT_PATH, "--document-type", documentType, "--image", tempFilePath], {
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK: "True",
        PYTHONIOENCODING: "utf-8",
        FLAGS_use_mkldnn: "0",
        OMP_NUM_THREADS: "1",
        MKL_NUM_THREADS: "1",
      },
    });

    const payload = JSON.parse(stdout.trim()) as OcrResponsePayload;
    if (!payload.ok) {
      if (payload.debug) {
        console.warn("patient identity OCR debug:", payload.debug);
      }
      return NextResponse.json({ message: payload.message ?? "OCR に失敗しました。", ...payload }, { status: 422 });
    }

    if (stderr.trim()) {
      console.warn("patient identity OCR stderr:", stderr.trim());
    }

    return NextResponse.json(payload);
  } catch (error) {
    if (typeof error === "object" && error && "stdout" in error) {
      const stdout = String((error as { stdout?: string }).stdout ?? "").trim();
      const stderr = String((error as { stderr?: string }).stderr ?? "").trim();
      if (stdout) {
        try {
          const payload = JSON.parse(stdout) as OcrResponsePayload;
          if (!payload.ok) {
            if (payload.debug) {
              console.warn("patient identity OCR debug:", payload.debug);
            }
            return NextResponse.json({ message: payload.message ?? "OCR に失敗しました。", ...payload }, { status: 422 });
          }
        } catch {
          // fall through to the generic 500 handler
        }
      }
      console.error("patient identity OCR child process failed", {
        code: (error as { code?: unknown }).code,
        stdout,
        stderr,
      });
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json(
          {
            message: "本人確認書類の読み取りに失敗しました。",
            debug: {
              code: (error as { code?: unknown }).code,
              stdout,
              stderr,
            },
          },
          { status: 500 }
        );
      }
    }
    console.error("POST /api/ems/patient-identity-ocr failed", error);
    await recordApiFailureEvent("api.ems.patient-identity-ocr.post", error);
    return NextResponse.json({ message: "本人確認書類の読み取りに失敗しました。" }, { status: 500 });
  } finally {
    if (tempFilePath) {
      await fs.rm(tempFilePath, { force: true }).catch(() => undefined);
    }
  }
}
