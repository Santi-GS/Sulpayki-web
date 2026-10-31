import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { ensureDatabaseInitialized } from "../../../../db/init";
import { pages } from "../../../../db/schema";
import { markPendingSiteChanges } from "../../../../lib/auth";
import { pageInputSchema } from "../../../../lib/validators";

export const prerender = false;

const ALLOWED_SLUGS = new Set(["sobre-nosotros"]);

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const slug = params.slug || "";
    if (!ALLOWED_SLUGS.has(slug)) {
      return new Response(
        JSON.stringify({ error: "Esta página no es editable desde aquí." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const rawBody: unknown = await request.json().catch(() => null);
    const parsed = pageInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: parsed.error.issues[0]?.message || "Datos inválidos.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await ensureDatabaseInitialized();
    const db = getDb();
    const now = new Date().toISOString();

    const existing = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
    if (existing.length === 0) {
      await db.insert(pages).values({
        slug,
        title: parsed.data.title,
        description: parsed.data.description,
        blocksJson: JSON.stringify(parsed.data.blocks),
        updatedAt: now,
      });
    } else {
      await db
        .update(pages)
        .set({
          title: parsed.data.title,
          description: parsed.data.description,
          blocksJson: JSON.stringify(parsed.data.blocks),
          updatedAt: now,
        })
        .where(eq(pages.slug, slug));
    }

    await markPendingSiteChanges();

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Update page error:", err);
    return new Response(
      JSON.stringify({ error: "No se pudo guardar la página." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

