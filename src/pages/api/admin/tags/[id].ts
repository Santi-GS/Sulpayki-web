import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { ensureDatabaseInitialized } from "../../../../db/init";
import { articleTags, tags } from "../../../../db/schema";
import { markPendingSiteChanges } from "../../../../lib/auth";

export const prerender = false;

export const DELETE: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return new Response(JSON.stringify({ error: "ID inválido." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  await ensureDatabaseInitialized();
  const db = getDb();
  await db.delete(articleTags).where(eq(articleTags.tagId, id));
  await db.delete(tags).where(eq(tags.id, id));
  await markPendingSiteChanges();

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

