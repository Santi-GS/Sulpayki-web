import type { APIRoute } from "astro";
import { getDb } from "../../../db/client";
import { ensureDatabaseInitialized } from "../../../db/init";
import { articles, articleTags, homeHero, media, pages, tags } from "../../../db/schema";

export const prerender = false;

export const GET: APIRoute = async () => {
  await ensureDatabaseInitialized();
  const db = getDb();

  const [heroRows, tagRows, articleRows, relRows, pageRows, mediaRows] = await Promise.all([
    db.select().from(homeHero),
    db.select().from(tags),
    db.select().from(articles),
    db.select().from(articleTags),
    db.select().from(pages),
    db.select().from(media),
  ]);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    project: "sulpayki-web",
    homeHero: heroRows,
    tags: tagRows,
    articles: articleRows,
    articleTags: relRows,
    pages: pageRows,
    media: mediaRows,
  };

  const dateStamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(snapshot, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="sulpayki-respaldo-${dateStamp}.json"`,
    },
  });
};

