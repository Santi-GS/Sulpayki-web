import type { APIRoute } from "astro";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { ensureDatabaseInitialized } from "../../../../db/init";
import { sessions, users } from "../../../../db/schema";
import { userUpdateSchema } from "../../../../lib/validators";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return new Response(JSON.stringify({ error: "ID de usuario inválido." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = userUpdateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.issues[0]?.message || "Datos inválidos." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Evitar que el propio Superadmin logueado se quite a sí mismo el rol SUPERADMIN
  if (locals.user?.id === id && parsed.data.role && parsed.data.role !== "SUPERADMIN") {
    return new Response(
      JSON.stringify({ error: "No podés quitarte el rol Superadmin a tu propia cuenta activa." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  await ensureDatabaseInitialized();
  const db = getDb();

  const updates: Partial<typeof users.$inferInsert> = {};
  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.role) updates.role = parsed.data.role;
  if (parsed.data.password && parsed.data.password.length >= 8) {
    updates.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }

  if (Object.keys(updates).length > 0) {
    let roleChanged = false;
    if (updates.role) {
      const [current] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      roleChanged = Boolean(current && current.role !== updates.role);
    }

    await db.update(users).set(updates).where(eq(users.id, id));

    if (updates.passwordHash || roleChanged) {
      await db.delete(sessions).where(eq(sessions.userId, id));
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return new Response(JSON.stringify({ error: "ID inválido." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (locals.user?.id === id) {
    return new Response(
      JSON.stringify({ error: "No podés eliminar tu propia cuenta mientras tenés sesión abierta." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  await ensureDatabaseInitialized();
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.userId, id));
  await db.delete(users).where(eq(users.id, id));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

