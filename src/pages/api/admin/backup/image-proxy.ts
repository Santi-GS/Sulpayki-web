import type { APIRoute } from "astro";
import { fetchExternalImageAsFile } from "../../../../lib/backup-image";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const targetUrl = url.searchParams.get("url")?.trim();
  if (!targetUrl) {
    return new Response("Falta parámetro url", { status: 400 });
  }

  try {
    const { bytes, contentType } = await fetchExternalImageAsFile(targetUrl);
    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al obtener la imagen.";
    return new Response(message, { status: 400 });
  }
};
