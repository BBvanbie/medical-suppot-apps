export function rethrowSchemaEnsureError(operation: string, error: unknown): never {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "42501") {
    throw new Error(
      `${operation} failed because the DB user cannot alter schema (42501). Apply the required schema setup before starting the app.`,
    );
  }

  throw error;
}
