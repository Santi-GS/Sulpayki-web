import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../db/client";
import { ensureDatabaseInitialized } from "../db/init";
import {
  articles,
  articleTags,
  homeHero,
  media,
  pages,
  siteState,
  tags,
  type ArticleType,
} from "../db/schema";
import type {
  ArticulosDestacadosItem,
  BlockData,
  HeroProps,
  Link,
  Tags,
} from "./types";

export interface StoredHeroSlide {
  id: number;
  titulo: string;
  text: string;
  imageUrl: string;
  imageAlt: string;
  linkHref: string;
}

export interface FullArticle {
  id: number;
  type: ArticleType;
  titulo: string;
  slug: string;
  resumen: string;
  descripcion: string;
  coverImagen: {
    id: number;
    documentId: string;
    url: string;
    alternativeText: string;
  };
  published: boolean;
  featured: boolean;
  publishedAt: string;
  updatedAt: string;
  tags: (Tags & { id: number; slug: string })[];
  tagIds: number[];
  blocks: BlockData[];
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function stripMarkdownPreview(md: string): string {
  return md
    .replace(/\[map:[^\]]*\]/g, "")
    .replace(/[#*_>`~\-]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

export async function getHomeHeroRaw(): Promise<{
  heading: string;
  links: Link[];
  slides: StoredHeroSlide[];
  updatedAt: string;
}> {
  await ensureDatabaseInitialized();
  const db = getDb();
  const [row] = await db.select().from(homeHero).where(eq(homeHero.id, 1)).limit(1);

  if (!row) {
    return {
      heading: "Diseñamos junto a vos tu viaje inolvidable.",
      links: [],
      slides: [],
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    heading: row.heading,
    links: safeJsonParse<Link[]>(row.linksJson, []),
    slides: safeJsonParse<StoredHeroSlide[]>(row.slidesJson, []),
    updatedAt: row.updatedAt,
  };
}

export async function getHomeHeroProps(): Promise<HeroProps> {
  const raw = await getHomeHeroRaw();
  return {
    __component: "block.hero",
    heading: raw.heading,
    links: raw.links,
    carruselHero: raw.slides.map((slide, index) => ({
      id: slide.id || index + 1,
      card: {
        id: slide.id || index + 1,
        titulo: slide.titulo,
        text: slide.text,
        imagen: {
          id: slide.id || index + 1,
          documentId: `hero-slide-${index + 1}`,
          url: slide.imageUrl,
          alternativeText: slide.imageAlt || slide.titulo,
        },
      },
      link: {
        href: slide.linkHref || "/destinos",
      },
    })),
  };
}

async function hydrateArticles(rows: (typeof articles.$inferSelect)[]): Promise<FullArticle[]> {
  if (rows.length === 0) return [];
  const db = getDb();
  const ids = rows.map((r) => r.id);

  const relations = await db
    .select({
      articleId: articleTags.articleId,
      tagId: tags.id,
      titulo: tags.titulo,
      slug: tags.slug,
      descripcion: tags.descripcion,
    })
    .from(articleTags)
    .innerJoin(tags, eq(articleTags.tagId, tags.id))
    .where(inArray(articleTags.articleId, ids));

  const tagsByArticle = new Map<number, (Tags & { id: number; slug: string })[]>();
  for (const rel of relations) {
    const list = tagsByArticle.get(rel.articleId) ?? [];
    list.push({
      id: rel.tagId,
      titulo: rel.titulo,
      slug: rel.slug,
      descripcion: rel.descripcion,
    });
    tagsByArticle.set(rel.articleId, list);
  }

  return rows.map((row) => {
    const assignedTags = tagsByArticle.get(row.id) ?? [];
    const resumenClean = row.resumen?.trim() || stripMarkdownPreview(row.descripcion);
    return {
      id: row.id,
      type: row.type,
      titulo: row.titulo,
      slug: row.slug,
      resumen: resumenClean,
      descripcion: row.descripcion,
      coverImagen: {
        id: row.id,
        documentId: `article-${row.id}`,
        url: row.coverUrl,
        alternativeText: row.coverAlt || row.titulo,
      },
      published: row.published,
      featured: row.featured,
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
      tags: assignedTags,
      tagIds: assignedTags.map((t) => t.id),
      blocks: safeJsonParse<BlockData[]>(row.blocksJson, []),
    };
  });
}

export async function getPublishedArticles(type: ArticleType): Promise<FullArticle[]> {
  await ensureDatabaseInitialized();
  const db = getDb();
  const rows = await db
    .select()
    .from(articles)
    .where(eq(articles.type, type))
    .orderBy(desc(articles.publishedAt));

  const publishedRows = rows.filter((r) => r.published);
  return hydrateArticles(publishedRows);
}

export function mapArticleToDestacadoItem(item: FullArticle): ArticulosDestacadosItem {
  return {
    id: item.id,
    documentId: `article-${item.id}`,
    titulo: item.titulo,
    descripcion: item.resumen || stripMarkdownPreview(item.descripcion),
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    slug: item.slug,
    coverImagen: item.coverImagen,
    tags: item.tags,
  };
}

export async function getFeaturedArticleItems(type: ArticleType): Promise<ArticulosDestacadosItem[]> {
  const published = await getPublishedArticles(type);
  const featuredOnly = published.filter((item) => item.featured);
  const selected = featuredOnly.length > 0 ? featuredOnly : published.slice(0, 8);

  return selected.map(mapArticleToDestacadoItem);
}

export function getRelatedArticleItems(
  current: FullArticle,
  pool: FullArticle[],
  limit = 6
): ArticulosDestacadosItem[] {
  const currentTagTitles = new Set(
    (current.tags ?? []).map((t) => t.titulo.trim().toLowerCase())
  );

  const candidates = pool.filter(
    (item) => item.id !== current.id && item.slug !== current.slug
  );

  const scored = candidates.map((item) => {
    const sharedTags = (item.tags ?? []).reduce((acc, tag) => {
      return acc + (currentTagTitles.has(tag.titulo.trim().toLowerCase()) ? 1 : 0);
    }, 0);
    const featuredBoost = item.featured ? 5 : 0;
    const score = sharedTags * 10 + featuredBoost;
    return { item, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.item.publishedAt || "").localeCompare(a.item.publishedAt || "");
  });

  return scored.slice(0, limit).map(({ item }) => mapArticleToDestacadoItem(item));
}

export async function getAllArticlesForAdmin(type?: ArticleType): Promise<FullArticle[]> {
  await ensureDatabaseInitialized();
  const db = getDb();
  const rows = type
    ? await db.select().from(articles).where(eq(articles.type, type)).orderBy(desc(articles.updatedAt))
    : await db.select().from(articles).orderBy(desc(articles.updatedAt));
  return hydrateArticles(rows);
}

export async function getArticleByIdForAdmin(id: number): Promise<FullArticle | null> {
  await ensureDatabaseInitialized();
  const db = getDb();
  const [row] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  if (!row) return null;
  const [hydrated] = await hydrateArticles([row]);
  return hydrated ?? null;
}

export async function getPageBySlug(slug: string): Promise<{
  slug: string;
  title: string;
  description: string;
  blocks: BlockData[];
  updatedAt: string;
}> {
  await ensureDatabaseInitialized();
  const db = getDb();
  const [row] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);

  if (!row) {
    return {
      slug,
      title: "Sobre Nosotros",
      description: "Conocé más sobre Sulpayki Viajes y Turismo.",
      blocks: [],
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    blocks: safeJsonParse<BlockData[]>(row.blocksJson, []),
    updatedAt: row.updatedAt,
  };
}

export async function getAllPages(): Promise<
  {
    slug: string;
    title: string;
    description: string;
    blocks: BlockData[];
    updatedAt: string;
  }[]
> {
  await ensureDatabaseInitialized();
  const db = getDb();
  const rows = await db.select().from(pages);
  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    description: row.description,
    blocks: safeJsonParse<BlockData[]>(row.blocksJson, []),
    updatedAt: row.updatedAt,
  }));
}

export async function getAllTags() {
  await ensureDatabaseInitialized();
  const db = getDb();
  return db.select().from(tags);
}

export async function getAllMedia() {
  await ensureDatabaseInitialized();
  const db = getDb();
  return db.select().from(media).orderBy(desc(media.createdAt));
}

export async function getSitePublishState(): Promise<{
  hasPendingChanges: boolean;
  lastPublishedAt: string | null;
  deployHookConfigured: boolean;
}> {
  await ensureDatabaseInitialized();
  const db = getDb();
  const [row] = await db.select().from(siteState).where(eq(siteState.id, 1)).limit(1);
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const hookUrl = metaEnv?.VERCEL_DEPLOY_HOOK_URL || process.env.VERCEL_DEPLOY_HOOK_URL;

  return {
    hasPendingChanges: row?.hasPendingChanges ?? false,
    lastPublishedAt: row?.lastPublishedAt ?? null,
    deployHookConfigured: Boolean(hookUrl && hookUrl.trim().length > 0),
  };
}
