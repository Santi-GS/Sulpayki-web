import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

function getEnv(key: string): string | undefined {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return metaEnv?.[key] || process.env[key];
}

export function getDatabaseUrl(): string {
  const configured = getEnv("TURSO_DATABASE_URL");
  if (configured && configured.trim().length > 0) {
    return configured.trim();
  }
  // En entorno serverless sin Turso configurado, usar /tmp para evitar errores de solo lectura
  if (process.env.VERCEL) {
    return "file:/tmp/sulpayki.db";
  }
  return "file:local.db";
}

export function isUsingRemoteTurso(): boolean {
  const url = getDatabaseUrl();
  return url.startsWith("libsql://") || url.startsWith("https://");
}

let cachedClient: Client | null = null;
let cachedDb: LibSQLDatabase<typeof schema> | null = null;

export function getLibsqlClient(): Client {
  if (!cachedClient) {
    const url = getDatabaseUrl();
    const authToken = getEnv("TURSO_AUTH_TOKEN");
    cachedClient = createClient({
      url,
      ...(authToken ? { authToken } : {}),
    });
  }
  return cachedClient;
}

export function getDb(): LibSQLDatabase<typeof schema> {
  if (!cachedDb) {
    cachedDb = drizzle(getLibsqlClient(), { schema });
  }
  return cachedDb;
}

