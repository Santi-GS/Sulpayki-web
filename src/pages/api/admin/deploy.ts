import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { ensureDatabaseInitialized } from "../../../db/init";
import { siteState } from "../../../db/schema";

export const prerender = false;

export const POST: APIRoute = async () => {
  try {
    await ensureDatabaseInitialized();
    const db = getDb();
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    const hookUrl = (metaEnv?.VERCEL_DEPLOY_HOOK_URL || process.env.VERCEL_DEPLOY_HOOK_URL || "").trim();
    const now = new Date().toISOString();

    if (!hookUrl) {
      // En desarrollo local sin Deploy Hook marcamos cambios como sincronizados y avisamos claramente
      await db
        .update(siteState)
        .set({ hasPendingChanges: false, lastPublishedAt: now })
        .where(eq(siteState.id, 1));

      return new Response(
        JSON.stringify({
          ok: true,
          localOnly: true,
          message:
            "Los cambios ya están guardados en la base de datos. En producción, configurá VERCEL_DEPLOY_HOOK_URL para reconstruir las páginas estáticas en Vercel con un clic.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const res = await fetch(hookUrl, { method: "POST" });
    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: "Vercel rechazó el Deploy Hook. Verificá que VERCEL_DEPLOY_HOOK_URL sea válida.",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    await db
      .update(siteState)
      .set({ hasPendingChanges: false, lastPublishedAt: now })
      .where(eq(siteState.id, 1));

    return new Response(
      JSON.stringify({
        ok: true,
        localOnly: false,
        message: "Publicación iniciada en Vercel. En 1 a 2 minutos la web pública mostrará todos los cambios.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Deploy hook error:", err);
    return new Response(
      JSON.stringify({ error: "No se pudo conectar con Vercel Deploy Hook." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

