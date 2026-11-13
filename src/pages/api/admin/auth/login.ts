import type { APIRoute } from "astro";
import {
  authenticateUser,
  checkRateLimit,
  clearFailedAttempts,
  createSession,
  MAX_LOGIN_ATTEMPTS_PER_EMAIL,
  MAX_LOGIN_ATTEMPTS_PER_IP_EMAIL,
  recordFailedAttempt,
  setSessionCookie,
} from "../../../../lib/auth";
import { loginSchema } from "../../../../lib/validators";

export const prerender = false;

function extractClientIp(request: Request, clientAddress?: string): string {
  const vercelIp = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercelIp) return vercelIp;

  const realIp = request.headers.get("x-real-ip")?.split(",")[0]?.trim();
  if (realIp) return realIp;

  const directIp = clientAddress?.trim();
  if (directIp) return directIp;

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwardedFor) return forwardedFor;

  return "unknown";
}

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  try {
    const rawBody: unknown = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: parsed.error.issues[0]?.message || "Revisá los datos ingresados.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();
    const ip = extractClientIp(request, clientAddress);
    const ipEmailKey = `${ip}:${normalizedEmail}`;
    const emailKey = `email:${normalizedEmail}`;

    const [ipLimit, emailLimit] = await Promise.all([
      checkRateLimit(ipEmailKey, MAX_LOGIN_ATTEMPTS_PER_IP_EMAIL),
      checkRateLimit(emailKey, MAX_LOGIN_ATTEMPTS_PER_EMAIL),
    ]);

    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retryAfterSeconds = Math.max(
        ipLimit.retryAfterSeconds ?? 0,
        emailLimit.retryAfterSeconds ?? 0,
        1
      );
      const retryMinutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
      return new Response(
        JSON.stringify({
          error: `Demasiados intentos fallidos. Volvé a intentar en ${retryMinutes} minutos.`,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSeconds),
          },
        }
      );
    }

    const user = await authenticateUser(normalizedEmail, password);
    if (!user) {
      await recordFailedAttempt(ipEmailKey);
      await recordFailedAttempt(emailKey);
      return new Response(
        JSON.stringify({ error: "El correo electrónico o la contraseña no son correctos." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    await clearFailedAttempts(ipEmailKey);
    await clearFailedAttempts(emailKey);
    const session = await createSession(user.id);
    setSessionCookie(cookies, session.token, session.expiresAt);

    return new Response(JSON.stringify({ ok: true, user }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Login error:", err);
    return new Response(
      JSON.stringify({ error: "No se pudo procesar el inicio de sesión." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

