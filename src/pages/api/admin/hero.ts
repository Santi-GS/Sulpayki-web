import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { ensureDatabaseInitialized } from "../../../db/init";
import { homeHero } from "../../../db/schema";
import { markPendingSiteChanges } from "../../../lib/auth";
import { homeHeroInputSchema } from "../../../lib/validators";

export const prerender = false;

export const PUT: APIRoute = async ({ request }) => {
  try {
    const rawBody: unknown = await request.json().catch(() => null);
    const parsed = homeHeroInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: parsed.error.issues[0]?.message || "Datos inválidos para la portada.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await ensureDatabaseInitialized();
    const db = getDb();
    const now = new Date().toISOString();

    const normalizedSlides = parsed.data.slides.map((slide, idx) => ({
      ...slide,
      id: idx + 1,
      imageAlt: slide.imageAlt || slide.titulo,
    }));

    const existing = await db.select().from(homeHero).where(eq(homeHero.id, 1)).limit(1);
    if (existing.length === 0) {
      await db.insert(homeHero).values({
        id: 1,
        heading: parsed.data.heading,
        linksJson: JSON.stringify(parsed.data.links),
        slidesJson: JSON.stringify(normalizedSlides),
        updatedAt: now,
      });
    } else {
      await db
        .update(homeHero)
        .set({
          heading: parsed.data.heading,
          linksJson: JSON.stringify(parsed.data.links),
          slidesJson: JSON.stringify(normalizedSlides),
          updatedAt: now,
        })
        .where(eq(homeHero.id, 1));
    }

    await markPendingSiteChanges();

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Hero update error:", err);
    return new Response(
      JSON.stringify({ error: "No se pudo guardar la portada de inicio." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

