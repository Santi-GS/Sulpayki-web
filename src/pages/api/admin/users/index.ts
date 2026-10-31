import type { APIRoute } from "astro";
import bcrypt from "bcryptjs";
import { getDb } from "../../../../db/client";
import { ensureDatabaseInitialized } from "../../../../db/init";
import { users } from "../../../../db/schema";
import { userCreateSchema } from "../../../../lib/validators";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody: unknown = await request.json().catch(() => null);
    const parsed = userCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || "Datos inválidos." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await ensureDatabaseInitialized();
    const db = getDb();
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const [created] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        role: parsed.data.role,
        createdAt: new Date().toISOString(),
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

    return new Response(JSON.stringify({ ok: true, user: created }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Create user error:", err);
    return new Response(
      JSON.stringify({ error: "Ya existe un usuario registrado con ese correo electrónico." }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }
};

