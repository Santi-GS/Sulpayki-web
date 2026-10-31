import type { APIRoute } from "astro";
import {
  authenticateUser,
  checkRateLimit,
  clearFailedAttempts,
  createSession,
  recordFailedAttempt,
  setSessionCookie,
} from "../../../../lib/auth";
import { loginSchema } from "../../../../lib/validators";

export const prerender = false;

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
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || clientAddress || "local";
    const rateKey = `${ip}:${email.toLowerCase()}`;

    const limit = checkRateLimit(rateKey);
    if (!limit.allowed) {
      return new Response(
        JSON.stringify({
          error: `Demasiados intentos fallidos. Volvé a intentar en ${Math.ceil((limit.retryAfterSeconds ?? 60) / 60)} minutos.`,
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      recordFailedAttempt(rateKey);
      return new Response(
        JSON.stringify({ error: "El correo electrónico o la contraseña no son correctos." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    clearFailedAttempts(rateKey);
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

