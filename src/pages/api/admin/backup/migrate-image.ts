import type { APIRoute } from "astro";
import { z } from "zod";
import { decodeDataUrlToFile, fetchExternalImageAsFile } from "../../../../lib/backup-image";
import { uploadImageFile } from "../../../../lib/cloudinary";

export const prerender = false;

const migrateImageSchema = z.object({
  sourceUrl: z.string().trim().min(1, "Falta la URL de origen."),
  dataUrl: z.string().optional(),
  filename: z.string().optional(),
  altText: z.string().optional(),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody: unknown = await request.json().catch(() => null);
    const parsed = migrateImageSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: parsed.error.issues[0]?.message || "Datos inválidos para migrar la imagen.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { sourceUrl, dataUrl, filename, altText } = parsed.data;

    let file: File;
    if (dataUrl) {
      file = decodeDataUrlToFile(dataUrl, filename);
    } else {
      const downloaded = await fetchExternalImageAsFile(sourceUrl, filename);
      file = downloaded.file;
    }

    const uploaded = await uploadImageFile(file);

    return new Response(
      JSON.stringify({
        ok: true,
        oldUrl: sourceUrl,
        newUrl: uploaded.url,
        newPublicId: uploaded.publicId,
        width: uploaded.width,
        height: uploaded.height,
        altText: altText || "",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo migrar la imagen.";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
