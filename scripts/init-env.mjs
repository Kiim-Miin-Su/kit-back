import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const envPath = resolve(rootDir, ".env");

const args = process.argv.slice(2);
const options = {
  preset: "compose",
  force: false,
  dryRun: false,
};

for (const arg of args) {
  if (arg.startsWith("--preset=")) {
    options.preset = arg.slice("--preset=".length);
  } else if (arg === "--force") {
    options.force = true;
  } else if (arg === "--dry-run") {
    options.dryRun = true;
  }
}

if (!["compose", "local-node"].includes(options.preset)) {
  console.error(`Unsupported preset: ${options.preset}`);
  process.exit(1);
}

const templates = {
  compose: [
    "# Generated for Docker Compose development",
    "HOST_PORT=4000",
    "PORT=4000",
    "POSTGRES_HOST_PORT=5432",
    "CORS_ORIGIN=http://localhost:3000",
    "",
    "# memory | prisma",
    "DATA_SOURCE=prisma",
    "",
    "# Docker Compose 내부 postgres 사용",
    "DATABASE_URL=postgresql://postgres@postgres:5432/ai_edu",
    "",
    "# 선택값",
    "POSTGRES_PASSWORD=",
    "AUTH_TOKEN_SECRET=",
    "OPENAI_API_KEY=",
    "",
  ].join("\n"),
  "local-node": [
    "# Generated for direct Node.js runtime",
    "HOST_PORT=4000",
    "PORT=4000",
    "POSTGRES_HOST_PORT=5432",
    "CORS_ORIGIN=http://localhost:3000",
    "",
    "# memory | prisma",
    "DATA_SOURCE=prisma",
    "",
    "# 로컬에 설치한 postgres 또는 로컬 docker postgres 기준",
    "DATABASE_URL=postgresql://postgres@localhost:5432/ai_edu",
    "",
    "# 선택값",
    "POSTGRES_PASSWORD=",
    "AUTH_TOKEN_SECRET=local-dev-auth-token-secret",
    "OPENAI_API_KEY=",
    "",
  ].join("\n"),
};

const content = templates[options.preset];

if (options.dryRun) {
  process.stdout.write(content);
  process.exit(0);
}

if (existsSync(envPath) && !options.force) {
  console.log(`.env already exists at ${envPath}`);
  console.log("Use --force to overwrite it.");
  process.exit(0);
}

writeFileSync(envPath, content, "utf8");

console.log(`Created ${envPath} with preset '${options.preset}'.`);

if (options.preset === "compose") {
  console.log("Next: docker compose up");
} else {
  console.log("Next: ensure PostgreSQL is running on localhost:5432, then run npm run start:dev:prisma");
}
