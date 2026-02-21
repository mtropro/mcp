import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = resolve(__dirname, "../.auth.json");

export interface Config {
  apiUrl: string;
  adminUrl: string;
  apiKey: string | null;
}

function loadApiKey(): string | null {
  // 1. Check environment variable
  if (process.env.MTROPRO_API_KEY) {
    return process.env.MTROPRO_API_KEY;
  }

  // 2. Check .auth.json file
  if (existsSync(AUTH_FILE)) {
    try {
      const data = JSON.parse(readFileSync(AUTH_FILE, "utf-8"));
      if (data.apiKey) {
        return data.apiKey;
      }
    } catch {
      // File exists but is invalid, ignore
    }
  }

  return null;
}

export function getConfig(): Config {
  return {
    apiUrl: process.env.MTROPRO_API_URL || "http://localhost:3000",
    adminUrl: process.env.MTROPRO_ADMIN_URL || "http://localhost:8080",
    apiKey: loadApiKey(),
  };
}

export function getAuthFilePath(): string {
  return AUTH_FILE;
}
