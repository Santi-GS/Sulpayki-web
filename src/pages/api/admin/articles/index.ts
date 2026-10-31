import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { ensureDatabaseInitialized } from "../../../../db/init";
import { articles, articleTags, type ArticleType } from "../../../../db/schema";
import { markPendingSiteChanges } from "../../../../lib/auth";
import { slugify } from "../../../../lib/index";
import { getAllArticlesForAdmin } from "../../../../lib/loaders";
import { articleInputSchema } from "../../../../lib/validators";

export const prerender = false;

async function ensureUniqueSlug(type: ArticleType, desiredSlug: string, excludeId?: number): Promise<string> {
  const db = getDb();
  const baseSlug = slugify(desiredSlug) || `item-${Date.now()}`;
  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await db
      .select({ id: articles.id })
      .from(articles)
      .where(and(eq(articles.type, type), eq(articles.slug, candidate)))
      .limit(1);

    if (existing.length === 0 || (excludeId !== undefined && existing[0]?.id === excludeId)) {
      return candidate;
    }
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

export const GET: APIRoute = async ({ url }) => {
  const typeParam = url.searchParams.get("type");
  const typeFilter =
    typeParam === "DESTINO" || typeParam === "SERVICIO" ? typeParam : undefined;
  const items = await getAllArticlesForAdmin(typeFilter);

  return new Response(JSON.stringify({ items }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody: unknown = await request.json().catch(() => null);
    const parsed = articleInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: parsed.error.issues[0]?.message || "Revisá los campos obligatorios del artículo.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await ensureDatabaseInitialized();
    const db = getDb();
    const data = parsed.data;
    const now = new Date().toISOString();
    const finalSlug = await ensureUniqueSlug(data.type, data.slug || data.titulo);

    const [created] = await db
      .insert(articles)
      .values({
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
        publishedAt: now,
        updatedAt: now,
      })
      .returning();

    if (created && data.tagIds.length > 0) {
      const uniqueTagIds = Array.from(new Set(data.tagIds));
      await db.insert(articleTags).values(
        uniqueTagIds.map((tagId) => ({
          articleId: created.id,
          tagId,
        }))
      );
    }

    await markPendingSiteChanges();

    return new Response(
      JSON.stringify({ ok: true, id: created?.id, slug: finalSlug }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Create article error:", err);
    return new Response(
      JSON.stringify({ error: "No se pudo crear el artículo." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

