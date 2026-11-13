import type { APIRoute } from "astro";
import { getDb } from "../../../../db/client";
import { ensureDatabaseInitialized } from "../../../../db/init";
import { media } from "../../../../db/schema";
import { uploadImageFile } from "../../../../lib/cloudinary";
import { getAllMedia } from "../../../../lib/loaders";

export const prerender = false;

function isValidMediaUrl(url: string): boolean {
  if (!url) return false;
  if (/[\u0000-\u001F\u007F\s"'`<>]/.test(url)) return false;

  if (url.startsWith("https://") || url.startsWith("http://")) {
    try {
      const parsed = new URL(url);
      return (parsed.protocol === "https:" || parsed.protocol === "http:") && Boolean(parsed.hostname);
    } catch {
      return false;
    }
  }

  return url.startsWith("/") && !url.startsWith("//") && url.length > 1;
}

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

    const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
    if (!isValidMediaUrl(rawUrl)) {
      return new Response(
        JSON.stringify({
          error:
            'Ingresá una URL de imagen válida que comience con "https://", "http://" o "/" y sin espacios ni caracteres inválidos.',
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const altText = typeof body?.altText === "string" ? body.altText.trim() : "";
    const [inserted] = await db
      .insert(media)
      .values({
        publicId: `external-${Date.now()}`,
        url: rawUrl,
        altText,
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

