import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { ensureDatabaseInitialized } from "../../../../db/init";
import { media } from "../../../../db/schema";
import { deleteCloudinaryImage } from "../../../../lib/cloudinary";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return new Response(JSON.stringify({ error: "ID inválido." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = (await request.json().catch(() => null)) as { altText?: string } | null;
  await ensureDatabaseInitialized();
  const db = getDb();

  await db
    .update(media)
    .set({ altText: (body?.altText || "").trim() })
    .where(eq(media.id, id));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

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
  const [found] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (found) {
    await deleteCloudinaryImage(found.publicId);
    await db.delete(media).where(eq(media.id, id));
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

