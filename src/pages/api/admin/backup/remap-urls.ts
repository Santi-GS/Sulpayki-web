import type { APIRoute } from "astro";
import { z } from "zod";
import { remapImageUrlsInDatabase } from "../../../../lib/backup";

export const prerender = false;

const remapSchema = z.object({
  replacements: z
    .array(
      z.object({
        oldUrl: z.string().trim().min(1),
        newUrl: z.string().trim().min(1),
        newPublicId: z.string().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        altText: z.string().optional(),
      })
    )
    .default([]),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody: unknown = await request.json().catch(() => null);
    const parsed = remapSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: parsed.error.issues[0]?.message || "Datos inválidos para actualizar enlaces.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await remapImageUrlsInDatabase(parsed.data.replacements);

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Remap image URLs error:", err);
    return new Response(
      JSON.stringify({ error: "No se pudieron actualizar las URLs de las imágenes." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
