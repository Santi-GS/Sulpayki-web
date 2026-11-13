import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, isUsingRemoteTurso } from "../db/client";
import { ensureDatabaseInitialized } from "../db/init";
import { articles, articleTags, homeHero, media, pages, tags } from "../db/schema";
import { markPendingSiteChanges } from "./auth";
import { safeParseJsonArray, walkBlockImages } from "./backup-images-extract";
import { isCloudinaryConfigured } from "./cloudinary";

export interface BackupImageRef {
  url: string;
  altText: string;
  publicId: string;
  width: number;
  height: number;
  sources: string[];
}

export interface BackupSummary {
  heroSlides: number;
  tags: number;
  articles: number;
  destinos: number;
  servicios: number;
  pages: number;
  media: number;
  referencedImages: number;
}

export interface BackupSnapshot {
  version: number;
  exportedAt: string;
  project: string;
  source: {
    databaseMode: "turso" | "local";
    cloudinaryConfigured: boolean;
  };
  summary: BackupSummary;
  homeHero: (typeof homeHero.$inferSelect)[];
  tags: (typeof tags.$inferSelect)[];
  articles: (typeof articles.$inferSelect)[];
  articleTags: (typeof articleTags.$inferSelect)[];
  pages: (typeof pages.$inferSelect)[];
  media: (typeof media.$inferSelect)[];
  images: BackupImageRef[];
  embeddedImages?: Record<string, EmbeddedImageData>;
}

export interface EmbeddedImageData {
  dataUrl: string;
  filename: string;
  altText?: string;
}

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupValidationError";
  }
}

function isValidJsonArrayString(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed);
  } catch {
    return false;
  }
}

function jsonArrayStringSchema(fieldName: string) {
  return z.string().refine(isValidJsonArrayString, {
    message: `El campo ${fieldName} debe contener un arreglo JSON válido.`,
  });
}

function isSafeBackupAssetUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (/[\s"'`<>\\\u0000-\u001F\u007F]/.test(trimmed)) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    try {
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  }
  return trimmed.startsWith("/");
}

function hasAnyBackupContent(snapshot: {
  homeHero: unknown[];
  tags: unknown[];
  articles: unknown[];
  pages: unknown[];
  media: unknown[];
}): boolean {
  return (
    snapshot.homeHero.length > 0 ||
    snapshot.tags.length > 0 ||
    snapshot.articles.length > 0 ||
    snapshot.pages.length > 0 ||
    snapshot.media.length > 0
  );
}

const boolishSchema = z
  .union([z.boolean(), z.number(), z.string()])
  .transform((val) => {
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val !== 0;
    return val === "true" || val === "1";
  });

const heroRowSchema = z.object({
  id: z.number().int().default(1),
  heading: z.string().default("Diseñamos junto a vos tu viaje inolvidable."),
  linksJson: jsonArrayStringSchema("linksJson").default("[]"),
  slidesJson: jsonArrayStringSchema("slidesJson").default("[]"),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

const tagRowSchema = z.object({
  id: z.number().int(),
  titulo: z.string().trim().min(1, "Cada etiqueta debe tener un título."),
  slug: z.string().trim().min(1, "Cada etiqueta debe tener un slug."),
  descripcion: z.string().default(""),
});

const articleRowSchema = z.object({
  id: z.number().int(),
  type: z.enum(["DESTINO", "SERVICIO"], {
    error: "El tipo de artículo debe ser DESTINO o SERVICIO.",
  }),
  titulo: z.string().trim().min(1, "Cada artículo debe tener un título."),
  slug: z.string().trim().min(1, "Cada artículo debe tener un slug."),
  resumen: z.string().default(""),
  descripcion: z.string().default(""),
  coverUrl: z
    .string()
    .trim()
    .refine(isSafeBackupAssetUrl, {
      message:
        "La URL de portada debe estar vacía o comenzar con https://, http:// o /, sin espacios ni comillas.",
    })
    .default(""),
  coverAlt: z.string().default(""),
  published: boolishSchema.default(true),
  featured: boolishSchema.default(false),
  blocksJson: jsonArrayStringSchema("blocksJson").default("[]"),
  publishedAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

const articleTagRowSchema = z.object({
  articleId: z.number().int(),
  tagId: z.number().int(),
});

const pageRowSchema = z.object({
  slug: z.string().trim().min(1, "Cada página debe tener un slug."),
  title: z.string().trim().min(1, "Cada página debe tener un título."),
  description: z.string().default(""),
  blocksJson: jsonArrayStringSchema("blocksJson").default("[]"),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

const mediaRowSchema = z.object({
  id: z.number().int().optional(),
  publicId: z.string().default("imported"),
  url: z
    .string()
    .trim()
    .min(1, "Cada registro multimedia debe tener una URL.")
    .refine(isSafeBackupAssetUrl, {
      message:
        "La URL multimedia debe comenzar con https://, http:// o /, sin espacios ni comillas.",
    }),
  altText: z.string().default(""),
  width: z.number().int().positive().default(800),
  height: z.number().int().positive().default(600),
  createdAt: z.string().default(() => new Date().toISOString()),
});

export const backupSnapshotSchema = z
  .object({
    version: z.number().int().optional(),
    exportedAt: z.string().optional(),
    project: z.string().optional(),
    homeHero: z.array(heroRowSchema).default([]),
    tags: z.array(tagRowSchema).default([]),
    articles: z.array(articleRowSchema).default([]),
    articleTags: z.array(articleTagRowSchema).default([]),
    pages: z.array(pageRowSchema).default([]),
    media: z.array(mediaRowSchema).default([]),
  })
  .refine(hasAnyBackupContent, {
    message:
      "El respaldo está vacío: debe contener al menos una tabla con datos (portada, etiquetas, artículos, páginas o medios).",
  });

export const backupImportRequestSchema = z.object({
  mode: z
    .enum(["replace", "merge"], {
      error: "El modo de restauración debe ser 'replace' o 'merge'.",
    })
    .default("replace"),
  snapshot: backupSnapshotSchema,
});

export type RestoreMode = "replace" | "merge";

export function collectImageReferences(params: {
  heroRows: (typeof homeHero.$inferSelect)[];
  articleRows: (typeof articles.$inferSelect)[];
  pageRows: (typeof pages.$inferSelect)[];
  mediaRows: (typeof media.$inferSelect)[];
}): BackupImageRef[] {
  const map = new Map<string, BackupImageRef>();

  const register = (
    url: string,
    source: string,
    meta?: Partial<Omit<BackupImageRef, "url" | "sources">>
  ) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    const existing = map.get(cleanUrl);
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
      if (!existing.altText && meta?.altText) existing.altText = meta.altText;
      if (!existing.publicId && meta?.publicId) existing.publicId = meta.publicId;
      return;
    }
    map.set(cleanUrl, {
      url: cleanUrl,
      altText: meta?.altText || "",
      publicId: meta?.publicId || "",
      width: meta?.width || 800,
      height: meta?.height || 600,
      sources: [source],
    });
  };

  for (const row of params.mediaRows) {
    register(row.url, "media", {
      altText: row.altText,
      publicId: row.publicId,
      width: row.width,
      height: row.height,
    });
  }

  for (const hero of params.heroRows) {
    const slides = safeParseJsonArray<Record<string, unknown>>(hero.slidesJson);
    slides.forEach((slide, idx) => {
      if (typeof slide.imageUrl === "string" && slide.imageUrl.trim()) {
        register(slide.imageUrl, `hero:slide-${idx + 1}`, {
          altText:
            (typeof slide.imageAlt === "string" && slide.imageAlt) ||
            (typeof slide.titulo === "string" ? slide.titulo : ""),
        });
      }
    });
  }

  for (const article of params.articleRows) {
    const tag = `article:${article.type}:${article.slug}`;
    if (article.coverUrl) {
      register(article.coverUrl, `${tag}:cover`, {
        altText: article.coverAlt || article.titulo,
      });
    }
    const blocks = safeParseJsonArray<unknown>(article.blocksJson);
    walkBlockImages(blocks, (url, altText) => {
      register(url, `${tag}:block`, { altText });
    });
  }

  for (const page of params.pageRows) {
    const blocks = safeParseJsonArray<unknown>(page.blocksJson);
    walkBlockImages(blocks, (url, altText) => {
      register(url, `page:${page.slug}:block`, { altText });
    });
  }

  return Array.from(map.values());
}

export async function buildBackupSnapshot(): Promise<BackupSnapshot> {
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

  const images = collectImageReferences({
    heroRows,
    articleRows,
    pageRows,
    mediaRows,
  });

  const heroSlides = heroRows.reduce(
    (acc, row) => acc + safeParseJsonArray<unknown>(row.slidesJson).length,
    0
  );
  const destinos = articleRows.filter((a) => a.type === "DESTINO").length;
  const servicios = articleRows.filter((a) => a.type === "SERVICIO").length;

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    project: "sulpayki-web",
    source: {
      databaseMode: isUsingRemoteTurso() ? "turso" : "local",
      cloudinaryConfigured: isCloudinaryConfigured(),
    },
    summary: {
      heroSlides,
      tags: tagRows.length,
      articles: articleRows.length,
      destinos,
      servicios,
      pages: pageRows.length,
      media: mediaRows.length,
      referencedImages: images.length,
    },
    homeHero: heroRows,
    tags: tagRows,
    articles: articleRows,
    articleTags: relRows,
    pages: pageRows,
    media: mediaRows,
    images,
  };
}

export interface RestoreResult {
  homeHero: number;
  tags: number;
  articles: number;
  articleTags: number;
  pages: number;
  media: number;
}

export async function restoreBackupSnapshot(
  rawSnapshot: z.infer<typeof backupSnapshotSchema>,
  mode: RestoreMode
): Promise<RestoreResult> {
  if (mode === "replace" && !hasAnyBackupContent(rawSnapshot)) {
    throw new BackupValidationError(
      "No se puede restaurar en modo reemplazo con un respaldo vacío."
    );
  }

  await ensureDatabaseInitialized();
  const db = getDb();
  const now = new Date().toISOString();

  const counts: RestoreResult = {
    homeHero: 0,
    tags: 0,
    articles: 0,
    articleTags: 0,
    pages: 0,
    media: 0,
  };

  await db.transaction(async (tx) => {
    const tagIdMap = new Map<number, number>();
    const articleIdMap = new Map<number, number>();

    if (mode === "replace") {
      await tx.delete(articleTags);
      await tx.delete(articles);
      await tx.delete(tags);
      await tx.delete(homeHero);
      await tx.delete(pages);
      await tx.delete(media);

      for (const tag of rawSnapshot.tags) {
        const [inserted] = await tx
          .insert(tags)
          .values({
            titulo: tag.titulo,
            slug: tag.slug,
            descripcion: tag.descripcion,
          })
          .returning({ id: tags.id });
        if (inserted) {
          tagIdMap.set(tag.id, inserted.id);
          counts.tags += 1;
        }
      }

      for (const article of rawSnapshot.articles) {
        const [inserted] = await tx
          .insert(articles)
          .values({
            type: article.type,
            titulo: article.titulo,
            slug: article.slug,
            resumen: article.resumen,
            descripcion: article.descripcion,
            coverUrl: article.coverUrl,
            coverAlt: article.coverAlt,
            published: article.published,
            featured: article.featured,
            blocksJson: article.blocksJson,
            publishedAt: article.publishedAt || now,
            updatedAt: article.updatedAt || now,
          })
          .returning({ id: articles.id });
        if (inserted) {
          articleIdMap.set(article.id, inserted.id);
          counts.articles += 1;
        }
      }

      const relSeen = new Set<string>();
      const relValues: { articleId: number; tagId: number }[] = [];
      for (const rel of rawSnapshot.articleTags) {
        const mappedArticleId = articleIdMap.get(rel.articleId);
        const mappedTagId = tagIdMap.get(rel.tagId);
        if (!mappedArticleId || !mappedTagId) continue;
        const key = `${mappedArticleId}:${mappedTagId}`;
        if (relSeen.has(key)) continue;
        relSeen.add(key);
        relValues.push({ articleId: mappedArticleId, tagId: mappedTagId });
      }
      if (relValues.length > 0) {
        await tx.insert(articleTags).values(relValues);
        counts.articleTags = relValues.length;
      }

      if (rawSnapshot.homeHero.length > 0) {
        const hero = rawSnapshot.homeHero[0]!;
        await tx.insert(homeHero).values({
          id: 1,
          heading: hero.heading,
          linksJson: hero.linksJson,
          slidesJson: hero.slidesJson,
          updatedAt: hero.updatedAt || now,
        });
        counts.homeHero = 1;
      }

      for (const page of rawSnapshot.pages) {
        await tx.insert(pages).values({
          slug: page.slug,
          title: page.title,
          description: page.description,
          blocksJson: page.blocksJson,
          updatedAt: page.updatedAt || now,
        });
        counts.pages += 1;
      }

      for (const item of rawSnapshot.media) {
        await tx.insert(media).values({
          publicId: item.publicId,
          url: item.url,
          altText: item.altText,
          width: item.width,
          height: item.height,
          createdAt: item.createdAt || now,
        });
        counts.media += 1;
      }
    } else {
      // Modo merge: actualiza coincidencias por slug o título y agrega nuevos registros sin borrar existentes
      const liveTags = await tx.select().from(tags);
      for (const tag of rawSnapshot.tags) {
        const bySlug = liveTags.find((t) => t.slug === tag.slug);
        const byTitulo = liveTags.find(
          (t) => t.titulo.toLowerCase() === tag.titulo.toLowerCase()
        );
        const match = bySlug ?? byTitulo;

        if (match) {
          const tituloConflict = liveTags.some(
            (t) =>
              t.id !== match.id &&
              t.titulo.toLowerCase() === tag.titulo.toLowerCase()
          );
          const nextTitulo = tituloConflict ? match.titulo : tag.titulo;

          await tx
            .update(tags)
            .set({ titulo: nextTitulo, descripcion: tag.descripcion })
            .where(eq(tags.id, match.id));

          match.titulo = nextTitulo;
          match.descripcion = tag.descripcion;
          tagIdMap.set(tag.id, match.id);
          counts.tags += 1;
        } else {
          const slugConflict = liveTags.some((t) => t.slug === tag.slug);
          const tituloConflict = liveTags.some(
            (t) => t.titulo.toLowerCase() === tag.titulo.toLowerCase()
          );
          if (!slugConflict && !tituloConflict) {
            const [inserted] = await tx
              .insert(tags)
              .values({
                titulo: tag.titulo,
                slug: tag.slug,
                descripcion: tag.descripcion,
              })
              .returning();
            if (inserted) {
              liveTags.push(inserted);
              tagIdMap.set(tag.id, inserted.id);
              counts.tags += 1;
            }
          }
        }
      }

      for (const article of rawSnapshot.articles) {
        const [existing] = await tx
          .select({ id: articles.id })
          .from(articles)
          .where(and(eq(articles.type, article.type), eq(articles.slug, article.slug)))
          .limit(1);

        if (existing) {
          await tx
            .update(articles)
            .set({
              titulo: article.titulo,
              resumen: article.resumen,
              descripcion: article.descripcion,
              coverUrl: article.coverUrl,
              coverAlt: article.coverAlt,
              published: article.published,
              featured: article.featured,
              blocksJson: article.blocksJson,
              updatedAt: article.updatedAt || now,
            })
            .where(eq(articles.id, existing.id));
          articleIdMap.set(article.id, existing.id);
        } else {
          const [inserted] = await tx
            .insert(articles)
            .values({
              type: article.type,
              titulo: article.titulo,
              slug: article.slug,
              resumen: article.resumen,
              descripcion: article.descripcion,
              coverUrl: article.coverUrl,
              coverAlt: article.coverAlt,
              published: article.published,
              featured: article.featured,
              blocksJson: article.blocksJson,
              publishedAt: article.publishedAt || now,
              updatedAt: article.updatedAt || now,
            })
            .returning({ id: articles.id });
          if (inserted) {
            articleIdMap.set(article.id, inserted.id);
          }
        }
        counts.articles += 1;
      }

      const existingRels = await tx.select().from(articleTags);
      const existingRelKeys = new Set(existingRels.map((r) => `${r.articleId}:${r.tagId}`));
      const newRelValues: { articleId: number; tagId: number }[] = [];
      for (const rel of rawSnapshot.articleTags) {
        const mappedArticleId = articleIdMap.get(rel.articleId);
        const mappedTagId = tagIdMap.get(rel.tagId);
        if (!mappedArticleId || !mappedTagId) continue;
        const key = `${mappedArticleId}:${mappedTagId}`;
        if (existingRelKeys.has(key)) continue;
        existingRelKeys.add(key);
        newRelValues.push({ articleId: mappedArticleId, tagId: mappedTagId });
      }
      if (newRelValues.length > 0) {
        await tx.insert(articleTags).values(newRelValues);
        counts.articleTags = newRelValues.length;
      }

      if (rawSnapshot.homeHero.length > 0) {
        const hero = rawSnapshot.homeHero[0]!;
        const [existingHero] = await tx
          .select({ id: homeHero.id })
          .from(homeHero)
          .where(eq(homeHero.id, 1))
          .limit(1);
        if (existingHero) {
          await tx
            .update(homeHero)
            .set({
              heading: hero.heading,
              linksJson: hero.linksJson,
              slidesJson: hero.slidesJson,
              updatedAt: hero.updatedAt || now,
            })
            .where(eq(homeHero.id, 1));
        } else {
          await tx.insert(homeHero).values({
            id: 1,
            heading: hero.heading,
            linksJson: hero.linksJson,
            slidesJson: hero.slidesJson,
            updatedAt: hero.updatedAt || now,
          });
        }
        counts.homeHero = 1;
      }

      for (const page of rawSnapshot.pages) {
        const [existingPage] = await tx
          .select({ slug: pages.slug })
          .from(pages)
          .where(eq(pages.slug, page.slug))
          .limit(1);
        if (existingPage) {
          await tx
            .update(pages)
            .set({
              title: page.title,
              description: page.description,
              blocksJson: page.blocksJson,
              updatedAt: page.updatedAt || now,
            })
            .where(eq(pages.slug, page.slug));
        } else {
          await tx.insert(pages).values({
            slug: page.slug,
            title: page.title,
            description: page.description,
            blocksJson: page.blocksJson,
            updatedAt: page.updatedAt || now,
          });
        }
        counts.pages += 1;
      }

      const existingMedia = await tx.select().from(media);
      const existingUrls = new Set(existingMedia.map((m) => m.url));
      for (const item of rawSnapshot.media) {
        if (existingUrls.has(item.url)) continue;
        existingUrls.add(item.url);
        await tx.insert(media).values({
          publicId: item.publicId,
          url: item.url,
          altText: item.altText,
          width: item.width,
          height: item.height,
          createdAt: item.createdAt || now,
        });
        counts.media += 1;
      }
    }
  });

  await markPendingSiteChanges();
  return counts;
}

export interface UrlReplacement {
  oldUrl: string;
  newUrl: string;
  newPublicId?: string;
  width?: number;
  height?: number;
  altText?: string;
}

export async function remapImageUrlsInDatabase(
  replacements: UrlReplacement[]
): Promise<{ updatedRecords: number }> {
  if (replacements.length === 0) return { updatedRecords: 0 };

  await ensureDatabaseInitialized();
  const db = getDb();
  const now = new Date().toISOString();

  const map = new Map<string, UrlReplacement>();
  for (const rep of replacements) {
    if (rep.oldUrl && rep.newUrl && rep.oldUrl !== rep.newUrl) {
      map.set(rep.oldUrl, rep);
    }
  }

  if (map.size === 0) return { updatedRecords: 0 };

  let updatedRecords = 0;

  await db.transaction(async (tx) => {
    // 1. Media
    const mediaRows = await tx.select().from(media);
    const matchedOldUrls = new Set<string>();

    for (const row of mediaRows) {
      const rep = map.get(row.url);
      if (!rep) continue;
      matchedOldUrls.add(row.url);
      await tx
        .update(media)
        .set({
          url: rep.newUrl,
          ...(rep.newPublicId ? { publicId: rep.newPublicId } : {}),
          ...(rep.width ? { width: rep.width } : {}),
          ...(rep.height ? { height: rep.height } : {}),
        })
        .where(eq(media.id, row.id));
      updatedRecords += 1;
    }

    // Registrar en media si la imagen migrada no tenía entrada previa
    for (const [oldUrl, rep] of map.entries()) {
      if (matchedOldUrls.has(oldUrl)) continue;
      await tx.insert(media).values({
        publicId: rep.newPublicId || `migrated-${Date.now()}`,
        url: rep.newUrl,
        altText: rep.altText || "",
        width: rep.width || 1200,
        height: rep.height || 800,
        createdAt: now,
      });
      updatedRecords += 1;
    }

    // 2. Home Hero slides
    const heroRows = await tx.select().from(homeHero);
    for (const hero of heroRows) {
      const slides = safeParseJsonArray<Record<string, unknown>>(hero.slidesJson);
      let changed = false;
      for (const slide of slides) {
        if (typeof slide.imageUrl === "string") {
          const rep = map.get(slide.imageUrl.trim());
          if (rep) {
            slide.imageUrl = rep.newUrl;
            changed = true;
          }
        }
      }
      if (changed) {
        await tx
          .update(homeHero)
          .set({ slidesJson: JSON.stringify(slides), updatedAt: now })
          .where(eq(homeHero.id, hero.id));
        updatedRecords += 1;
      }
    }

    // 3. Articles (coverUrl + blocksJson)
    const articleRows = await tx.select().from(articles);
    for (const article of articleRows) {
      let changed = false;
      let nextCoverUrl = article.coverUrl;
      const coverRep = map.get(article.coverUrl.trim());
      if (coverRep) {
        nextCoverUrl = coverRep.newUrl;
        changed = true;
      }

      const blocks = safeParseJsonArray<unknown>(article.blocksJson);
      walkBlockImages(blocks, (url, _alt, updateUrl) => {
        const rep = map.get(url);
        if (rep) {
          updateUrl(rep.newUrl);
          changed = true;
        }
      });

      if (changed) {
        await tx
          .update(articles)
          .set({
            coverUrl: nextCoverUrl,
            blocksJson: JSON.stringify(blocks),
            updatedAt: now,
          })
          .where(eq(articles.id, article.id));
        updatedRecords += 1;
      }
    }

    // 4. Pages (blocksJson)
    const pageRows = await tx.select().from(pages);
    for (const page of pageRows) {
      let changed = false;
      const blocks = safeParseJsonArray<unknown>(page.blocksJson);
      walkBlockImages(blocks, (url, _alt, updateUrl) => {
        const rep = map.get(url);
        if (rep) {
          updateUrl(rep.newUrl);
          changed = true;
        }
      });

      if (changed) {
        await tx
          .update(pages)
          .set({
            blocksJson: JSON.stringify(blocks),
            updatedAt: now,
          })
          .where(eq(pages.slug, page.slug));
        updatedRecords += 1;
      }
    }
  });

  if (updatedRecords > 0) {
    await markPendingSiteChanges();
  }

  return { updatedRecords };
}
