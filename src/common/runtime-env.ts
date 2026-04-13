const DEFAULT_CORS_ORIGIN = "http://localhost:3000";
const DEFAULT_AUTH_TOKEN_SECRET = "local-dev-auth-token-secret";
const DEV_CORS_ORIGIN_PATTERNS = [
  /^http:\/\/localhost(?::\d+)?$/,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
];

function readNonEmptyEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

export function validateProductionRuntimeEnv() {
  if (!isProductionRuntime()) {
    return;
  }

  const missingVariables = ["CORS_ORIGIN", "AUTH_TOKEN_SECRET"].filter(
    (name) => readNonEmptyEnv(name) === null,
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables in production: ${missingVariables.join(", ")}`,
    );
  }
}

export function readCorsOrigin() {
  const configured = readNonEmptyEnv("CORS_ORIGIN");

  if (configured) {
    const values = configured
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    return values.length <= 1 ? values[0] : values;
  }

  if (!isProductionRuntime()) {
    return DEV_CORS_ORIGIN_PATTERNS;
  }

  return DEFAULT_CORS_ORIGIN;
}

export function readAuthTokenSecret() {
  const secret = readNonEmptyEnv("AUTH_TOKEN_SECRET");

  if (secret) {
    return secret;
  }

  if (isProductionRuntime()) {
    throw new Error("AUTH_TOKEN_SECRET must be set in production.");
  }

  return DEFAULT_AUTH_TOKEN_SECRET;
}
