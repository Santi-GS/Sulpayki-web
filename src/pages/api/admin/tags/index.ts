import type { APIRoute } from "astro";
import { getDb } from "../../../../db/client";
import { ensureDatabaseInitialized } from "../../../../db/init";
import { tags } from "../../../../db/schema";
import { markPendingSiteChanges } from "../../../../lib/auth";
import { slugify } from "../../../../lib/index";
import { tagInputSchema } from "../../../../lib/validators";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody: unknown = await request.json().catch(() => null);
    const parsed = tagInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || "Datos inválidos." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await ensureDatabaseInitialized();
    const db = getDb();
    const slug = slugify(parsed.data.titulo);

    const [created] = await db
      .insert(tags)
      .values({
        titulo: parsed.data.titulo,
        slug,
        descripcion: parsed.data.descripcion,
      })
      .returning();

    await markPendingSiteChanges();

    return new Response(JSON.stringify({ ok: true, item: created }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Create tag error:", err);
    return new Response(
      JSON.stringify({ error: "Ya existe una etiqueta con ese nombre o no se pudo crear." }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }
};

