import type { APIRoute } from "astro";
import { getDb } from "../../../../db/client";
import { ensureDatabaseInitialized } from "../../../../db/init";
import { media } from "../../../../db/schema";
import { uploadImageFile } from "../../../../lib/cloudinary";
import { getAllMedia } from "../../../../lib/loaders";

export const prerender = false;

export const GET: APIRoute = async () => {
  const items = await getAllMedia();
  return new Response(JSON.stringify({ items }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get("content-type") || "";
    await ensureDatabaseInitialized();
    const db = getDb();
    const now = new Date().toISOString();

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      const altText = String(formData.get("altText") || "").trim();

      if (!(file instanceof File) || file.size === 0) {
        return new Response(
          JSON.stringify({ error: "Seleccioná un archivo de imagen válido." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const uploaded = await uploadImageFile(file);
      const [inserted] = await db
        .insert(media)
        .values({
          publicId: uploaded.publicId,
          url: uploaded.url,
          altText: altText || file.name.replace(/\.[^.]+$/, ""),
          width: uploaded.width,
          height: uploaded.height,
          createdAt: now,
        })
        .returning();

      return new Response(JSON.stringify({ ok: true, item: inserted }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    // También soportar registro manual por URL externa si el administrador pega un enlace
    const body = (await request.json().catch(() => null)) as {
      url?: string;
      altText?: string;
    } | null;

    if (!body?.url || typeof body.url !== "string" || !body.url.trim()) {
      return new Response(
        JSON.stringify({ error: "Ingresá una URL de imagen válida." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const [inserted] = await db
      .insert(media)
      .values({
        publicId: `external-${Date.now()}`,
        url: body.url.trim(),
        altText: (body.altText || "").trim(),
        width: 1200,
        height: 800,
        createdAt: now,
      })
      .returning();

    return new Response(JSON.stringify({ ok: true, item: inserted }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo subir la imagen.";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};

