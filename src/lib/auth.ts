import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { AstroCookies } from "astro";
import { eq, lt, lte, or, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { ensureDatabaseInitialized } from "../db/init";
import { loginAttempts, sessions, siteState, users, type UserRole } from "../db/schema";
import type { AuthenticatedUser } from "../env.d";

export const SESSION_COOKIE_NAME = "sulpayki_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14; // 14 días

// Control persistente de intentos fallidos en Turso/SQLite para mitigar fuerza bruta
export const MAX_LOGIN_ATTEMPTS_PER_IP_EMAIL = 8;
export const MAX_LOGIN_ATTEMPTS_PER_EMAIL = 20;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

export async function checkRateLimit(
  identifier: string,
  maxAttempts = MAX_LOGIN_ATTEMPTS_PER_IP_EMAIL
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  await ensureDatabaseInitialized();
  const db = getDb();
  const now = Date.now();

  const [record] = await db
    .select({
      count: loginAttempts.count,
      resetAt: loginAttempts.resetAt,
    })
    .from(loginAttempts)
    .where(eq(loginAttempts.key, identifier))
    .limit(1);

  if (!record || now >= record.resetAt) {
    return { allowed: true };
  }

  if (record.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
    };
  }

  return { allowed: true };
}

export async function recordFailedAttempt(identifier: string): Promise<void> {
  await ensureDatabaseInitialized();
  const db = getDb();
  const now = Date.now();
  const nextResetAt = now + WINDOW_MS;

  await db.delete(loginAttempts).where(lte(loginAttempts.resetAt, now));

  await db
    .insert(loginAttempts)
    .values({
      key: identifier,
      count: 1,
      resetAt: nextResetAt,
    })
    .onConflictDoUpdate({
      target: loginAttempts.key,
      set: {
        count: sql`CASE WHEN ${loginAttempts.resetAt} <= ${now} THEN 1 ELSE ${loginAttempts.count} + 1 END`,
        resetAt: sql`CASE WHEN ${loginAttempts.resetAt} <= ${now} THEN ${nextResetAt} ELSE ${loginAttempts.resetAt} END`,
      },
    });
}

export async function clearFailedAttempts(identifier: string): Promise<void> {
  await ensureDatabaseInitialized();
  const db = getDb();
  const now = Date.now();

  await db
    .delete(loginAttempts)
    .where(or(eq(loginAttempts.key, identifier), lte(loginAttempts.resetAt, now)));
}

function getAuthSecret(): string {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const configured = (metaEnv?.AUTH_SECRET || process.env.AUTH_SECRET || "").trim();

  if (process.env.VERCEL) {
    if (configured.length < 16) {
      throw new Error(
        "AUTH_SECRET debe estar configurado con al menos 16 caracteres en producción (Vercel)."
      );
    }
    return configured;
  }

  return configured || "sulpayki-dev-secret-change-in-prod";
}

function hashToken(rawToken: string): string {
  return crypto.createHmac("sha256", getAuthSecret()).update(rawToken).digest("hex");
}

export async function authenticateUser(email: string, password: string): Promise<AuthenticatedUser | null> {
  await ensureDatabaseInitialized();
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();

  const [found] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (!found) {
    // Ejecutar comparación simulada para evitar enumeración por tiempo
    await bcrypt.compare(password, "$2b$10$CwTycUXWue0Thq9StjUM0uJ8p4rV7xQ1Z2Y3X4W5V6U7T8S9R0Q1O");
    return null;
  }

  const valid = await bcrypt.compare(password, found.passwordHash);
  if (!valid) return null;

  return {
    id: found.id,
    email: found.email,
    name: found.name,
    role: found.role,
  };
}

export async function createSession(userId: number): Promise<{ token: string; expiresAt: Date }> {
  await ensureDatabaseInitialized();
  const db = getDb();
  const now = Date.now();

  // Limpiar sesiones expiradas ocasionalmente
  await db.delete(sessions).where(lt(sessions.expiresAt, now));

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAtMs = now + SESSION_DURATION_MS;

  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash,
    expiresAt: expiresAtMs,
    createdAt: new Date(now).toISOString(),
  });

  return {
    token: rawToken,
    expiresAt: new Date(expiresAtMs),
  };
}

export async function getUserFromCookies(cookies: AstroCookies): Promise<AuthenticatedUser | null> {
  const rawToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  await ensureDatabaseInitialized();
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  const now = Date.now();

  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  if (row.expiresAt <= now) {
    await db.delete(sessions).where(eq(sessions.id, row.sessionId));
    return null;
  }

  return {
    id: row.userId,
    email: row.email,
    name: row.name,
    role: row.role,
  };
}

export async function destroySessionFromCookies(cookies: AstroCookies): Promise<void> {
  const rawToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (rawToken) {
    await ensureDatabaseInitialized();
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(rawToken)));
  }
  clearSessionCookie(cookies);
}

export function setSessionCookie(cookies: AstroCookies, token: string, expiresAt: Date): void {
  const isProd = import.meta.env.PROD || Boolean(process.env.VERCEL);
  cookies.set(SESSION_COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    expires: expiresAt,
  });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE_NAME, {
    path: "/",
  });
}

export function hasRequiredRole(user: AuthenticatedUser | null, required: UserRole): boolean {
  if (!user) return false;
  if (user.role === "SUPERADMIN") return true;
  return user.role === required;
}

export async function markPendingSiteChanges(): Promise<void> {
  await ensureDatabaseInitialized();
  const db = getDb();
  await db
    .update(siteState)
    .set({ hasPendingChanges: true })
    .where(eq(siteState.id, 1));
}

