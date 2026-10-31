import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { ensureDatabaseInitialized } from "../../../../db/init";
import { articles, articleTags, type ArticleType } from "../../../../db/schema";
import { markPendingSiteChanges } from "../../../../lib/auth";
import { slugify } from "../../../../lib/index";
import { articleInputSchema } from "../../../../lib/validators";

export const prerender = false;

async function ensureUniqueSlugForUpdate(
  type: ArticleType,
  desiredSlug: string,
  currentId: number
): Promise<string> {
  const db = getDb();
  const baseSlug = slugify(desiredSlug) || `item-${currentId}`;
  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await db
      .select({ id: articles.id })
      .from(articles)
      .where(and(eq(articles.type, type), eq(articles.slug, candidate)))
      .limit(1);

    if (existing.length === 0 || existing[0]?.id === currentId) {
      return candidate;
    }
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return new Response(JSON.stringify({ error: "Identificador inválido." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rawBody: unknown = await request.json().catch(() => null);
    const parsed = articleInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: parsed.error.issues[0]?.message || "Revisá los campos del formulario.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await ensureDatabaseInitialized();
    const db = getDb();
    const [existing] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
    if (!existing) {
      return new Response(JSON.stringify({ error: "El artículo no existe." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = parsed.data;
    const finalSlug = await ensureUniqueSlugForUpdate(data.type, data.slug || data.titulo, id);
    const now = new Date().toISOString();

    await db
      .update(articles)
      .set({
        type: data.type,
        titulo: data.titulo,
        slug: finalSlug,
        resumen: data.resumen,
        descripcion: data.descripcion,
        coverUrl: data.coverUrl,
        coverAlt: data.coverAlt || data.titulo,
        published: data.published,
        featured: data.featured,
        blocksJson: JSON.stringify(data.blocks),
        updatedAt: now,
      })
      .where(eq(articles.id, id));

    await db.delete(articleTags).where(eq(articleTags.articleId, id));
    if (data.tagIds.length > 0) {
      const uniqueTagIds = Array.from(new Set(data.tagIds));
      await db.insert(articleTags).values(
        uniqueTagIds.map((tagId) => ({
          articleId: id,
          tagId,
        }))
      );
    }

    await markPendingSiteChanges();

    return new Response(JSON.stringify({ ok: true, id, slug: finalSlug }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Update article error:", err);
    return new Response(
      JSON.stringify({ error: "No se pudieron guardar los cambios del artículo." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return new Response(JSON.stringify({ error: "Identificador inválido." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await ensureDatabaseInitialized();
    const db = getDb();
    await db.delete(articleTags).where(eq(articleTags.articleId, id));
    await db.delete(articles).where(eq(articles.id, id));
    await markPendingSiteChanges();

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Delete article error:", err);
    return new Response(
      JSON.stringify({ error: "No se pudo eliminar el artículo." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

