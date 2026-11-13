import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  fetchExternalImageAsFile,
  validateExternalImageUrl,
} from "../src/lib/backup-image.ts";
import {
  extractBackupImageItems,
  walkBlockImages,
  type BackupImageItem,
} from "../src/lib/backup-images-extract.ts";
import { uploadImageFile } from "../src/lib/cloudinary.ts";
import {
  renderMarkdown,
  sanitizeHref,
  sanitizeImageUrl,
} from "../src/lib/markdown.ts";

const execFileAsync = promisify(execFile);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Resolve extensionless relative TS imports (e.g. `../db/client`) used inside `src/`
const TS_BOOTSTRAP_SOURCE = `
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      const code = err && typeof err === "object" ? err.code : undefined;
      if (
        (code === "ERR_MODULE_NOT_FOUND" || code === "ERR_UNSUPPORTED_DIR_IMPORT") &&
        context.parentURL &&
        (specifier.startsWith("./") || specifier.startsWith("../"))
      ) {
        for (const suffix of [".ts", "/index.ts"]) {
          const candidate = new URL(specifier + suffix, context.parentURL);
          if (existsSync(fileURLToPath(candidate))) {
            return nextResolve(candidate.href, context);
          }
        }
      }
      throw err;
    }
  },
});
`;

const TS_BOOTSTRAP_DATA_URL =
  "data:text/javascript;base64," +
  Buffer.from(TS_BOOTSTRAP_SOURCE, "utf8").toString("base64");

await import(TS_BOOTSTRAP_DATA_URL);

const backupModule = await import("../src/lib/backup.ts");
const { backupSnapshotSchema } = backupModule;

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sulpayki-test-"));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
}

async function runIsolatedNodeScript<T = unknown>(
  scriptBody: string,
  envOverrides: Record<string, string | undefined>
): Promise<T> {
  const childEnv: NodeJS.ProcessEnv = { ...process.env };
  delete childEnv.TURSO_DATABASE_URL;
  delete childEnv.TURSO_AUTH_TOKEN;
  delete childEnv.VERCEL;
  delete childEnv.AUTH_SECRET;
  delete childEnv.INITIAL_SUPERADMIN_EMAIL;
  delete childEnv.INITIAL_SUPERADMIN_PASSWORD;
  delete childEnv.INITIAL_EDITOR_EMAIL;
  delete childEnv.INITIAL_EDITOR_PASSWORD;

  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === undefined) {
      delete childEnv[key];
    } else {
      childEnv[key] = value;
    }
  }

  const { stdout } = await execFileAsync(
    process.execPath,
    ["--import", TS_BOOTSTRAP_DATA_URL, "--input-type=module", "-e", scriptBody],
    {
      cwd: REPO_ROOT,
      env: childEnv,
      maxBuffer: 4 * 1024 * 1024,
    }
  );

  const lines = stdout
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
  const lastLine = lines.at(-1);
  if (!lastLine) {
    return undefined as T;
  }
  return JSON.parse(lastLine) as T;
}

describe("src/lib/markdown.ts", () => {
  it("sanitizeHref permite protocolos seguros y bloquea esquemas/vectores peligrosos", () => {
    assert.equal(sanitizeHref("https://sulpayki.com/destinos?a=1#mapa"), "https://sulpayki.com/destinos?a=1#mapa");
    assert.equal(sanitizeHref("  http://example.com/ruta  "), "http://example.com/ruta");
    assert.equal(sanitizeHref("mailto:hola@sulpayki.com"), "mailto:hola@sulpayki.com");
    assert.equal(sanitizeHref("tel:+5493804000000"), "tel:+5493804000000");
    assert.equal(sanitizeHref("/destinos"), "/destinos");
    assert.equal(sanitizeHref("./contacto"), "./contacto");
    assert.equal(sanitizeHref("../servicios"), "../servicios");
    assert.equal(sanitizeHref("#preguntas"), "#preguntas");

    const dangerous = [
      null,
      undefined,
      "",
      "   ",
      "javascript:alert(1)",
      "JAVASCRIPT:alert(document.cookie)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "//evil.example/phish",
      "/\\evil.example/phish",
      "mailto:",
      "tel:",
      "https://example.com/espacio no",
      "https://example.com/\u0000evil",
    ];
    for (const candidate of dangerous) {
      assert.equal(sanitizeHref(candidate), "#", `Esperaba '#' para ${String(candidate)}`);
    }
  });

  it("sanitizeImageUrl permite http/https/rutas con '/' y rechaza esquemas inseguros", () => {
    assert.equal(sanitizeImageUrl("https://cdn.example.com/foto.webp"), "https://cdn.example.com/foto.webp");
    assert.equal(sanitizeImageUrl("http://example.com/foto.png"), "http://example.com/foto.png");
    assert.equal(sanitizeImageUrl(" /uploads/paisaje.jpg "), "/uploads/paisaje.jpg");

    const unsafe = [
      null,
      undefined,
      "",
      "   ",
      "javascript:alert(1)",
      "data:image/svg+xml,<svg onload=alert(1)>",
      "//evil.example/img.png",
      "/\\evil.example/img.png",
      "./relativa.png",
      "../relativa.png",
      "https://example.com/con espacio.png",
      "https://example.com/\nimg.png",
    ];
    for (const candidate of unsafe) {
      assert.equal(sanitizeImageUrl(candidate), "", `Esperaba '' para ${String(candidate)}`);
    }
  });

  it("renderMarkdown bloquea XSS (<script>, <img onerror>, javascript:) y preserva embeds de Google Maps", () => {
    assert.equal(renderMarkdown(""), "");
    assert.equal(renderMarkdown("   "), "");
    assert.equal(renderMarkdown(null), "");

    const xssPayload = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(2)">',
      "[Click malicioso](javascript:alert(3))",
      "![Alt seguro](javascript:alert(4))",
      "![Alt data](data:text/html;base64,PHNjcmlwdD4=)",
      "![Alt proto-rel](//evil.example/a.png)",
    ].join("\n\n");

    const renderedXss = renderMarkdown(xssPayload);
    assert.doesNotMatch(renderedXss, /<script\b/i);
    assert.doesNotMatch(renderedXss, /<img\b/i);
    assert.doesNotMatch(renderedXss, /<svg\b/i);
    assert.doesNotMatch(renderedXss, /javascript:/i);
    assert.match(renderedXss, /&lt;script&gt;/);
    assert.match(renderedXss, /&lt;img src=&quot;x&quot; onerror=&quot;alert\(1\)&quot;&gt;/);
    assert.match(renderedXss, /&lt;svg onload=&quot;alert\(2\)&quot;&gt;/);
    assert.match(renderedXss, /href="#"/);
    assert.match(renderedXss, /Alt seguro/);

    const validContent = [
      "Visitá nuestra [página](https://example.com/info) o [contacto](/contacto).",
      "![Foto](/uploads/foto.webp)",
      "[map:https://www.google.com/maps/embed?pb=123|Oficina]",
    ].join("\n\n");

    const renderedValid = renderMarkdown(validContent);
    assert.match(renderedValid, /<a href="https:\/\/example\.com\/info" target="_blank" rel="noopener noreferrer">página<\/a>/);
    assert.match(renderedValid, /<a href="\/contacto">contacto<\/a>/);
    assert.match(renderedValid, /<img src="\/uploads\/foto\.webp" alt="Foto">/);
    assert.match(renderedValid, /class="map-container/);
    assert.match(renderedValid, /<h3[^>]*>Oficina<\/h3>/);
    assert.match(
      renderedValid,
      /<iframe[\s\S]*src="https:\/\/www\.google\.com\/maps\/embed\?pb=123"[\s\S]*title="Oficina"/
    );

    const evilMap = renderMarkdown(
      "[map:https://evil.example/maps/embed?pb=123|Falso]\n[map:https://www.google.com/maps/embed?pb=123|Oficina\"><script>alert(1)</script>]"
    );
    assert.doesNotMatch(evilMap, /src="https:\/\/evil\.example/);
    assert.doesNotMatch(evilMap, /<script\b/i);
    assert.match(evilMap, /<iframe[\s\S]*src="https:\/\/www\.google\.com\/maps\/embed\?pb=123"/);
  });
});

describe("src/lib/backup-images-extract.ts", () => {
  it("walkBlockImages recorre contenido-con-imagen y carrusel-de-imagenes y actualiza URLs in-place", () => {
    const blocks: unknown[] = [
      null,
      "texto",
      {
        __component: "block.contenido-con-imagen",
        imagen: { url: "  https://old.example/uno.jpg  ", alternativeText: "Uno" },
      },
      {
        __component: "block.carrusel-de-imagenes",
        imagen: [
          null,
          { imagen: { url: "/uploads/dos.png", alternativeText: "Dos" } },
          { url: "https://old.example/tres.webp", alternativeText: "Tres" },
          { imagen: { url: "   ", alternativeText: "Vacia" } },
        ],
      },
    ];

    const visited: Array<{ url: string; altText: string }> = [];
    walkBlockImages(blocks, (url, altText, updateUrl) => {
      visited.push({ url, altText });
      updateUrl(`/migrated/${visited.length}.webp`);
    });

    assert.deepEqual(visited, [
      { url: "https://old.example/uno.jpg", altText: "Uno" },
      { url: "/uploads/dos.png", altText: "Dos" },
      { url: "https://old.example/tres.webp", altText: "Tres" },
    ]);

    const b1 = blocks[2] as { imagen: { url: string } };
    const b2 = blocks[3] as { imagen: Array<{ imagen?: { url: string }; url?: string }> };
    assert.equal(b1.imagen.url, "/migrated/1.webp");
    assert.equal(b2.imagen[1]?.imagen?.url, "/migrated/2.webp");
    assert.equal(b2.imagen[2]?.url, "/migrated/3.webp");
  });

  it("extractBackupImageItems deduplica fuentes/altText y respeta backup.images si trae ítems válidos", () => {
    assert.deepEqual(extractBackupImageItems({}), []);

    const extracted = extractBackupImageItems({
      media: [{ url: "https://cdn.example/shared.jpg", altText: "" }],
      homeHero: [
        {
          slidesJson: JSON.stringify([
            { imageUrl: "https://cdn.example/shared.jpg", imageAlt: "Alt desde hero" },
            { imageUrl: "/uploads/hero-only.webp", titulo: "Slide titulo" },
          ]),
        },
      ],
      articles: [
        {
          type: "DESTINO",
          slug: "talampaya",
          coverUrl: "https://cdn.example/shared.jpg",
          coverAlt: "Cover alt",
          blocksJson: JSON.stringify([
            {
              __component: "block.contenido-con-imagen",
              imagen: { url: "/uploads/article-block.png", alternativeText: "Bloque" },
            },
          ]),
        },
      ],
      pages: [
        {
          slug: "sobre-nosotros",
          blocksJson: JSON.stringify([
            {
              __component: "block.carrusel-de-imagenes",
              imagen: [{ imagen: { url: "/uploads/article-block.png", alternativeText: "" } }],
            },
          ]),
        },
      ],
    });

    assert.deepEqual(extracted, [
      {
        url: "https://cdn.example/shared.jpg",
        altText: "Alt desde hero",
        sources: ["media", "hero:slide-1", "article:DESTINO:talampaya:cover"],
      },
      {
        url: "/uploads/hero-only.webp",
        altText: "Slide titulo",
        sources: ["hero:slide-2"],
      },
      {
        url: "/uploads/article-block.png",
        altText: "Bloque",
        sources: ["article:DESTINO:talampaya:block", "page:sobre-nosotros:block"],
      },
    ]);

    const precomputed = extractBackupImageItems({
      images: [
        { url: "  ", altText: "Invalido" },
        { url: " https://cdn.example/direct.webp ", altText: "Directo", sources: ["media"] },
      ],
      media: [{ url: "/uploads/ignored.png", altText: "Ignored" }],
    });
    assert.deepEqual(precomputed, [
      { url: "https://cdn.example/direct.webp", altText: "Directo", sources: ["media"] },
    ]);

    const fallbackWhenImagesEmpty = extractBackupImageItems({
      images: [{ url: "   ", altText: "Vacio" }] as BackupImageItem[],
      media: [{ url: "/uploads/fallback.png", altText: "Fallback" }],
    });
    assert.deepEqual(fallbackWhenImagesEmpty, [
      { url: "/uploads/fallback.png", altText: "Fallback", sources: ["media"] },
    ]);
  });
});

describe("src/lib/backup.ts", () => {
  it("backupSnapshotSchema rechaza objeto vacío, URLs inseguras y JSON malformados", () => {
    assert.equal(backupSnapshotSchema.safeParse({}).success, false);
    assert.equal(
      backupSnapshotSchema.safeParse({
        homeHero: [],
        tags: [],
        articles: [],
        articleTags: [],
        pages: [],
        media: [],
      }).success,
      false
    );

    const validSnapshot = {
      tags: [{ id: 1, titulo: "Naturaleza", slug: "naturaleza", descripcion: "Parques" }],
      articles: [
        {
          id: 10,
          type: "DESTINO" as const,
          titulo: "Talampaya",
          slug: "talampaya",
          coverUrl: "https://cdn.example.com/talampaya.webp",
          blocksJson: "[]",
        },
      ],
      media: [{ publicId: "m1", url: "/uploads/foto.webp", altText: "Foto" }],
      homeHero: [{ id: 1, heading: "Bienvenidos", linksJson: "[]", slidesJson: "[]" }],
      pages: [{ slug: "sobre-nosotros", title: "Sobre Nosotros", blocksJson: "[]" }],
    };
    assert.equal(backupSnapshotSchema.safeParse(validSnapshot).success, true);

    const unsafeCoverUrls = [
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "//evil.example/img.png",
      "https://example.com/a b.png",
      'https://example.com/a"<script>.png',
    ];
    for (const coverUrl of unsafeCoverUrls) {
      const res = backupSnapshotSchema.safeParse({
        ...validSnapshot,
        articles: [{ ...validSnapshot.articles[0], coverUrl }],
      });
      assert.equal(res.success, false, `Debió rechazar coverUrl: ${coverUrl}`);
    }

    for (const url of ["", ...unsafeCoverUrls]) {
      const res = backupSnapshotSchema.safeParse({
        ...validSnapshot,
        media: [{ ...validSnapshot.media[0], url }],
      });
      assert.equal(res.success, false, `Debió rechazar media.url: ${url}`);
    }

    const badJsonCases = [
      { ...validSnapshot, homeHero: [{ id: 1, heading: "H", linksJson: "{bad", slidesJson: "[]" }] },
      { ...validSnapshot, homeHero: [{ id: 1, heading: "H", linksJson: "[]", slidesJson: '{"a":1}' }] },
      { ...validSnapshot, articles: [{ ...validSnapshot.articles[0], blocksJson: "{broken" }] },
      { ...validSnapshot, pages: [{ ...validSnapshot.pages[0], blocksJson: '{"not":"array"}' }] },
    ];
    for (const candidate of badJsonCases) {
      assert.equal(backupSnapshotSchema.safeParse(candidate).success, false);
    }
  });

  it("restoreBackupSnapshot rechaza replace vacío, resuelve colisiones UNIQUE(titulo/slug) en merge y remapea imágenes", async () => {
    await withTempDir(async (dir) => {
      const dbUrl = pathToFileURL(path.join(dir, "backup.db")).href;
      const result = await runIsolatedNodeScript<{
        emptyReplaceErrorName: string;
        emptyReplaceMessage: string;
        replaceCounts: { tags: number; articles: number; articleTags: number };
        mergeCounts: { tags: number; articles: number; articleTags: number };
        finalTags: Array<{ id: number; titulo: string; slug: string; descripcion: string }>;
        finalArticleTagCount: number;
        noopZero: number;
        noopSame: number;
        remapUpdatedRecords: number;
        mediaUrls: string[];
        heroSlidesJson: string;
        articleCoverUrl: string;
        articleBlocksJson: string;
        pageBlocksJson: string;
        hasPendingChanges: boolean;
      }>(
        `
import { eq } from "drizzle-orm";
import { getDb, getLibsqlClient } from "./src/db/client.ts";
import { articles, articleTags, homeHero, media, pages, siteState, tags } from "./src/db/schema.ts";
import {
  BackupValidationError,
  remapImageUrlsInDatabase,
  restoreBackupSnapshot,
} from "./src/lib/backup.ts";

const emptySnapshot = {
  homeHero: [],
  tags: [],
  articles: [],
  articleTags: [],
  pages: [],
  media: [],
};

let emptyReplaceErrorName = "";
let emptyReplaceMessage = "";
try {
  await restoreBackupSnapshot(emptySnapshot, "replace");
} catch (err) {
  emptyReplaceErrorName = err instanceof BackupValidationError ? err.name : String(err?.name);
  emptyReplaceMessage = err instanceof Error ? err.message : String(err);
}

const replaceCounts = await restoreBackupSnapshot(
  {
    homeHero: [
      {
        id: 1,
        heading: "Hero inicial",
        linksJson: "[]",
        slidesJson: JSON.stringify([
          { id: 1, titulo: "Slide 1", imageUrl: "https://old.example/a.jpg" },
          { id: 2, titulo: "Slide 2", imageUrl: "https://old.example/b.png" },
        ]),
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    tags: [
      { id: 10, titulo: "Naturaleza", slug: "naturaleza", descripcion: "Orig 1" },
      { id: 20, titulo: "Cultura", slug: "cultura", descripcion: "Orig 2" },
    ],
    articles: [
      {
        id: 100,
        type: "DESTINO",
        titulo: "Talampaya",
        slug: "talampaya",
        resumen: "",
        descripcion: "",
        coverUrl: "https://old.example/a.jpg",
        coverAlt: "Cover",
        published: true,
        featured: true,
        blocksJson: JSON.stringify([
          {
            __component: "block.contenido-con-imagen",
            imagen: { url: "https://old.example/b.png", alternativeText: "B" },
          },
          {
            __component: "block.carrusel-de-imagenes",
            imagen: [{ imagen: { url: "https://old.example/c.webp", alternativeText: "C" } }],
          },
        ]),
        publishedAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    articleTags: [
      { articleId: 100, tagId: 10 },
      { articleId: 100, tagId: 10 },
    ],
    pages: [
      {
        slug: "sobre-nosotros",
        title: "Sobre Nosotros",
        description: "",
        blocksJson: JSON.stringify([
          {
            __component: "block.contenido-con-imagen",
            imagen: { url: "https://old.example/c.webp", alternativeText: "C" },
          },
        ]),
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    media: [
      {
        publicId: "old-a",
        url: "https://old.example/a.jpg",
        altText: "A",
        width: 800,
        height: 600,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  },
  "replace"
);

// Merge con colisiones múltiples:
// - tag 501 comparte slug "naturaleza" pero su titulo "Cultura" colisiona con tag existente "Cultura" -> conserva titulo "Naturaleza"
// - tag 502 tiene slug nuevo pero titulo "CULTURA" (colisión case-insensitive) -> actualiza "Cultura"
// - tag 503 inserta "Aventura" y tag 504 intenta "aventura" con otro slug en el mismo snapshot -> sin error UNIQUE
const mergeCounts = await restoreBackupSnapshot(
  {
    homeHero: [],
    tags: [
      { id: 501, titulo: "Cultura", slug: "naturaleza", descripcion: "Actualizada slug" },
      { id: 502, titulo: "CULTURA", slug: "cultura-nueva", descripcion: "Actualizada titulo" },
      { id: 503, titulo: "Aventura", slug: "aventura", descripcion: "Nueva 1" },
      { id: 504, titulo: "aventura", slug: "aventura-alt", descripcion: "Nueva 2" },
    ],
    articles: [
      {
        id: 200,
        type: "SERVICIO",
        titulo: "Traslados",
        slug: "traslados",
        resumen: "",
        descripcion: "",
        coverUrl: "/uploads/traslado.webp",
        coverAlt: "",
        published: true,
        featured: false,
        blocksJson: "[]",
        publishedAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    articleTags: [
      { articleId: 200, tagId: 501 },
      { articleId: 200, tagId: 503 },
    ],
    pages: [],
    media: [],
  },
  "merge"
);

const { updatedRecords: noopZero } = await remapImageUrlsInDatabase([]);
const { updatedRecords: noopSame } = await remapImageUrlsInDatabase([
  { oldUrl: "/uploads/a.webp", newUrl: "/uploads/a.webp" },
]);

const { updatedRecords: remapUpdatedRecords } = await remapImageUrlsInDatabase([
  {
    oldUrl: "https://old.example/a.jpg",
    newUrl: "/uploads/a.webp",
    newPublicId: "local-a",
    width: 1200,
    height: 900,
  },
  {
    oldUrl: "https://old.example/b.png",
    newUrl: "/uploads/b.webp",
    altText: "B migrada",
  },
  {
    oldUrl: "https://old.example/c.webp",
    newUrl: "/uploads/c.webp",
  },
]);

const db = getDb();
const finalTags = await db.select().from(tags);
const rels = await db.select().from(articleTags);
const mediaRows = await db.select().from(media);
const [heroRow] = await db.select().from(homeHero).where(eq(homeHero.id, 1));
const [artRow] = await db.select().from(articles).where(eq(articles.slug, "talampaya"));
const [pageRow] = await db.select().from(pages).where(eq(pages.slug, "sobre-nosotros"));
const [stateRow] = await db.select().from(siteState).where(eq(siteState.id, 1));

getLibsqlClient().close();

console.log(JSON.stringify({
  emptyReplaceErrorName,
  emptyReplaceMessage,
  replaceCounts,
  mergeCounts,
  finalTags,
  finalArticleTagCount: rels.length,
  noopZero,
  noopSame,
  remapUpdatedRecords,
  mediaUrls: mediaRows.map((m) => m.url).sort(),
  heroSlidesJson: heroRow?.slidesJson ?? "",
  articleCoverUrl: artRow?.coverUrl ?? "",
  articleBlocksJson: artRow?.blocksJson ?? "",
  pageBlocksJson: pageRow?.blocksJson ?? "",
  hasPendingChanges: Boolean(stateRow?.hasPendingChanges),
}));
`,
        { TURSO_DATABASE_URL: dbUrl }
      );

      assert.equal(result.emptyReplaceErrorName, "BackupValidationError");
      assert.match(result.emptyReplaceMessage, /vacío/i);
      assert.deepEqual(result.replaceCounts, {
        tags: 2,
        articles: 1,
        articleTags: 1,
        homeHero: 1,
        pages: 1,
        media: 1,
      });
      assert.equal(result.mergeCounts.tags, 4);
      assert.equal(result.mergeCounts.articles, 1);
      assert.equal(result.mergeCounts.articleTags, 2);
      assert.equal(result.finalArticleTagCount, 3);

      const naturalezaTag = result.finalTags.find((t) => t.slug === "naturaleza");
      const culturaTag = result.finalTags.find((t) => t.slug === "cultura");
      const aventuraTag = result.finalTags.find((t) => t.slug === "aventura");
      assert.ok(naturalezaTag);
      assert.equal(naturalezaTag.titulo, "Naturaleza");
      assert.equal(naturalezaTag.descripcion, "Actualizada slug");
      assert.ok(culturaTag);
      assert.equal(culturaTag.descripcion, "Actualizada titulo");
      assert.ok(aventuraTag);
      assert.equal(aventuraTag.descripcion, "Nueva 2");
      assert.equal(result.finalTags.length, 3);

      assert.equal(result.noopZero, 0);
      assert.equal(result.noopSame, 0);
      assert.equal(result.remapUpdatedRecords, 6);
      assert.deepEqual(result.mediaUrls, ["/uploads/a.webp", "/uploads/b.webp", "/uploads/c.webp"]);
      assert.match(result.heroSlidesJson, /\/uploads\/a\.webp/);
      assert.match(result.heroSlidesJson, /\/uploads\/b\.webp/);
      assert.equal(result.articleCoverUrl, "/uploads/a.webp");
      assert.match(result.articleBlocksJson, /\/uploads\/b\.webp/);
      assert.match(result.articleBlocksJson, /\/uploads\/c\.webp/);
      assert.match(result.pageBlocksJson, /\/uploads\/c\.webp/);
      assert.equal(result.hasPendingChanges, true);
    });
  });
});

describe("src/lib/backup-image.ts", () => {
  it("validateExternalImageUrl bloquea localhost, IPs privadas/link-local/CGNAT e IPv4-mapped IPv6", () => {
    assert.equal(
      validateExternalImageUrl("https://cdn.example.com/foto.jpg").href,
      "https://cdn.example.com/foto.jpg"
    );
    assert.equal(
      validateExternalImageUrl("https://8.8.8.8/img.png").href,
      "https://8.8.8.8/img.png"
    );

    const blockedUrls = [
      "not-a-url",
      "file:///etc/passwd",
      "ftp://example.com/a.jpg",
      "javascript:alert(1)",
      "http://localhost/img.png",
      "http://sub.localhost/img.png",
      "http://printer.local/img.png",
      "http://metadata.internal/img.png",
      "http://0.0.0.0/img.png",
      "http://127.0.0.1/img.png",
      "http://127.10.20.30/img.png",
      "http://10.0.0.1/img.png",
      "http://172.16.0.1/img.png",
      "http://172.31.255.254/img.png",
      "http://192.168.1.50/img.png",
      "http://169.254.169.254/latest/meta-data",
      "http://100.64.0.1/img.png",
      "http://[::1]/img.png",
      "http://[::]/img.png",
      "http://[fe80::1]/img.png",
      "http://[fc00::1]/img.png",
      "http://[fd12:3456::1]/img.png",
      "http://[::ffff:127.0.0.1]/img.png",
      "http://[::ffff:7f00:1]/img.png",
      "http://[::ffff:169.254.169.254]/img.png",
      "http://[::ffff:a9fe:a9fe]/img.png",
    ];

    for (const url of blockedUrls) {
      assert.throws(() => validateExternalImageUrl(url), `Debió bloquear ${url}`);
    }
  });

  it("fetchExternalImageAsFile bloquea redirecciones SSRF y streams/Content-Length mayores a 10 MB", async () => {
    const originalFetch = globalThis.fetch;

    try {
      // 1. Redirección SSRF a 127.0.0.1 bloqueada sin hacer segunda petición
      let ssrfFetchCalls = 0;
      globalThis.fetch = (async (_input, init) => {
        ssrfFetchCalls += 1;
        assert.equal(init?.redirect, "manual");
        if (ssrfFetchCalls > 1) {
          throw new Error("No debió seguir la redirección SSRF");
        }
        return new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1/secret.png" },
        });
      }) as typeof fetch;

      await assert.rejects(
        () => fetchExternalImageAsFile("https://example.com/pic.png"),
        /Host de imagen no permitido/
      );
      assert.equal(ssrfFetchCalls, 1);

      // 2. Redirección SSRF a IPv6 mapped IPv4 metadata
      let metadataCalls = 0;
      globalThis.fetch = (async () => {
        metadataCalls += 1;
        return new Response(null, {
          status: 301,
          headers: { location: "http://[::ffff:a9fe:a9fe]/latest/meta-data" },
        });
      }) as typeof fetch;

      await assert.rejects(
        () => fetchExternalImageAsFile("https://example.com/pic.png"),
        /Host de imagen no permitido/
      );
      assert.equal(metadataCalls, 1);

      // 3. Exceso de redirecciones (> 3)
      let redirectCount = 0;
      globalThis.fetch = (async () => {
        redirectCount += 1;
        return new Response(null, {
          status: 302,
          headers: { location: `https://example.com/hop-${redirectCount}.png` },
        });
      }) as typeof fetch;

      await assert.rejects(
        () => fetchExternalImageAsFile("https://example.com/start.png"),
        /máximo de redirecciones/
      );
      assert.equal(redirectCount, 4);

      // 4. Redirección pública válida funciona
      let validStep = 0;
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      globalThis.fetch = (async (input) => {
        validStep += 1;
        if (validStep === 1) {
          assert.equal(String(input), "https://example.com/old.png");
          return new Response(null, {
            status: 302,
            headers: { location: "/cdn/final.png" },
          });
        }
        assert.equal(String(input), "https://example.com/cdn/final.png");
        return new Response(pngBytes, {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      }) as typeof fetch;

      const downloaded = await fetchExternalImageAsFile("https://example.com/old.png");
      assert.equal(downloaded.contentType, "image/png");
      assert.equal(downloaded.file.type, "image/png");
      assert.equal(downloaded.file.name, "final.png");
      assert.deepEqual(downloaded.bytes, pngBytes);

      // 5. Content-Length > 10 MB aborta y cancela el stream
      let headerCancelled = false;
      let headerSignalAborted = false;
      globalThis.fetch = (async (_input, init) => {
        init?.signal?.addEventListener("abort", () => {
          headerSignalAborted = true;
        });
        const stream = new ReadableStream<Uint8Array>({
          cancel() {
            headerCancelled = true;
          },
        });
        return new Response(stream, {
          status: 200,
          headers: {
            "content-type": "image/jpeg",
            "content-length": String(10 * 1024 * 1024 + 1),
          },
        });
      }) as typeof fetch;

      await assert.rejects(
        () => fetchExternalImageAsFile("https://example.com/huge-header.jpg"),
        /límite máximo de 10 MB/
      );
      assert.equal(headerCancelled, true);
      assert.equal(headerSignalAborted, true);

      // 6. Stream chunked > 10 MB sin Content-Length aborta en cuanto supera el límite
      let streamCancelled = false;
      let streamAborted = false;
      let chunksEmitted = 0;
      globalThis.fetch = (async (_input, init) => {
        init?.signal?.addEventListener("abort", () => {
          streamAborted = true;
        });
        const oneMbChunk = new Uint8Array(1024 * 1024);
        const stream = new ReadableStream<Uint8Array>({
          pull(controller) {
            if (chunksEmitted >= 20) {
              controller.close();
              return;
            }
            chunksEmitted += 1;
            controller.enqueue(oneMbChunk);
          },
          cancel() {
            streamCancelled = true;
          },
        });
        return new Response(stream, {
          status: 200,
          headers: { "content-type": "image/webp" },
        });
      }) as typeof fetch;

      await assert.rejects(
        () => fetchExternalImageAsFile("https://example.com/huge-stream.webp"),
        /límite máximo de 10 MB/
      );
      assert.equal(streamCancelled, true);
      assert.equal(streamAborted, true);
      assert.ok(chunksEmitted <= 12, `Debió cortar pronto, emitió ${chunksEmitted} MB`);

      // 7. Rechaza respuestas HTTP no exitosas y Content-Type no soportados
      globalThis.fetch = (async () =>
        new Response("not found", { status: 404 })) as typeof fetch;
      await assert.rejects(
        () => fetchExternalImageAsFile("https://example.com/missing.png"),
        /No se pudo descargar la imagen \(404\)/
      );

      globalThis.fetch = (async () =>
        new Response("<html></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        })) as typeof fetch;
      await assert.rejects(
        () => fetchExternalImageAsFile("https://example.com/page"),
        /no es una imagen soportada/
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("src/lib/cloudinary.ts", () => {
  it("uploadImageFile deriva la extensión exclusivamente de file.type e ignora .html/.svg en file.name", async () => {
    const savedEnv = {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
      VERCEL: process.env.VERCEL,
    };

    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    delete process.env.VERCEL;

    const createdFiles: string[] = [];

    try {
      const pngPayload = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      const htmlNamedFile = new File([pngPayload], "exploit.html", { type: "image/png" });
      const resPng = await uploadImageFile(htmlNamedFile);
      assert.match(resPng.url, /^\/uploads\/\d+-[0-9a-f]+\.png$/);
      assert.match(resPng.publicId, /^local-\d+-[0-9a-f]+\.png$/);
      const pngDiskPath = path.join(REPO_ROOT, "public", resPng.url.replace(/^\//, ""));
      createdFiles.push(pngDiskPath);
      const writtenPng = await fs.readFile(pngDiskPath);
      assert.deepEqual(new Uint8Array(writtenPng), pngPayload);

      const jpgPayload = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
      const svgNamedFile = new File([jpgPayload], "xss.svg", { type: "image/jpeg" });
      const resJpg = await uploadImageFile(svgNamedFile);
      assert.match(resJpg.url, /^\/uploads\/\d+-[0-9a-f]+\.jpg$/);
      assert.match(resJpg.publicId, /^local-\d+-[0-9a-f]+\.jpg$/);
      const jpgDiskPath = path.join(REPO_ROOT, "public", resJpg.url.replace(/^\//, ""));
      createdFiles.push(jpgDiskPath);
      const writtenJpg = await fs.readFile(jpgDiskPath);
      assert.deepEqual(new Uint8Array(writtenJpg), jpgPayload);

      await assert.rejects(
        () => uploadImageFile(new File(["<svg/>"], "foto.png", { type: "image/svg+xml" })),
        /Formato de imagen no soportado/
      );
      await assert.rejects(
        () => uploadImageFile(new File(["<script/>"], "foto.jpg", { type: "text/html" })),
        /Formato de imagen no soportado/
      );
      await assert.rejects(
        () =>
          uploadImageFile(
            new File([new Uint8Array(10 * 1024 * 1024 + 1)], "huge.png", { type: "image/png" })
          ),
        /tamaño máximo permitido de 10 MB/
      );

      process.env.VERCEL = "1";
      await assert.rejects(
        () => uploadImageFile(new File([pngPayload], "foto.png", { type: "image/png" })),
        /Cloudinary no está configurado/
      );
    } finally {
      for (const filePath of createdFiles) {
        await fs.unlink(filePath).catch(() => {});
      }
      for (const [k, v] of Object.entries(savedEnv)) {
        if (v === undefined) {
          delete process.env[k];
        } else {
          process.env[k] = v;
        }
      }
    }
  });
});

describe("src/lib/auth.ts", () => {
  it("authenticateUser y rate limiting persistente en DB funcionan entre procesos aislados", async () => {
    await withTempDir(async (dir) => {
      const dbUrl = pathToFileURL(path.join(dir, "auth.db")).href;
      const rateKey = "203.0.113.10:admin@sulpayki.com";

      const proc1 = await runIsolatedNodeScript<{
        authValid: { email: string; role: string } | null;
        authWrongPass: unknown;
        authMissingUser: unknown;
        initialCheck: { allowed: boolean };
        after7Check: { allowed: boolean };
        after8Check: { allowed: boolean; retryAfterSeconds?: number };
      }>(
        `
import { getLibsqlClient } from "./src/db/client.ts";
import {
  authenticateUser,
  checkRateLimit,
  MAX_LOGIN_ATTEMPTS_PER_IP_EMAIL,
  recordFailedAttempt,
} from "./src/lib/auth.ts";

const authValid = await authenticateUser("  ADMIN@SULPAYKI.COM  ", "TestSuperPass123!");
const authWrongPass = await authenticateUser("admin@sulpayki.com", "WrongPass!");
const authMissingUser = await authenticateUser("nobody@sulpayki.com", "TestSuperPass123!");

const initialCheck = await checkRateLimit(${JSON.stringify(rateKey)}, MAX_LOGIN_ATTEMPTS_PER_IP_EMAIL);
for (let i = 0; i < 7; i += 1) {
  await recordFailedAttempt(${JSON.stringify(rateKey)});
}
const after7Check = await checkRateLimit(${JSON.stringify(rateKey)}, MAX_LOGIN_ATTEMPTS_PER_IP_EMAIL);
await recordFailedAttempt(${JSON.stringify(rateKey)});
const after8Check = await checkRateLimit(${JSON.stringify(rateKey)}, MAX_LOGIN_ATTEMPTS_PER_IP_EMAIL);

getLibsqlClient().close();

console.log(JSON.stringify({
  authValid: authValid ? { email: authValid.email, role: authValid.role } : null,
  authWrongPass,
  authMissingUser,
  initialCheck,
  after7Check,
  after8Check,
}));
`,
        {
          TURSO_DATABASE_URL: dbUrl,
          INITIAL_SUPERADMIN_EMAIL: "admin@sulpayki.com",
          INITIAL_SUPERADMIN_PASSWORD: "TestSuperPass123!",
        }
      );

      assert.deepEqual(proc1.authValid, { email: "admin@sulpayki.com", role: "SUPERADMIN" });
      assert.equal(proc1.authWrongPass, null);
      assert.equal(proc1.authMissingUser, null);
      assert.equal(proc1.initialCheck.allowed, true);
      assert.equal(proc1.after7Check.allowed, true);
      assert.equal(proc1.after8Check.allowed, false);
      assert.ok((proc1.after8Check.retryAfterSeconds ?? 0) >= 1);

      // Segundo proceso limpio apuntando al mismo archivo SQLite verifica persistencia real en DB
      const proc2 = await runIsolatedNodeScript<{
        persistedBlocked: { allowed: boolean; retryAfterSeconds?: number };
        afterClear: { allowed: boolean };
        emailCheckBefore20: { allowed: boolean };
        emailCheckAt20: { allowed: boolean; retryAfterSeconds?: number };
        afterExpiryCheck: { allowed: boolean };
        expiredPrunedCount: number;
      }>(
        `
import { eq } from "drizzle-orm";
import { getDb, getLibsqlClient } from "./src/db/client.ts";
import { loginAttempts } from "./src/db/schema.ts";
import {
  checkRateLimit,
  clearFailedAttempts,
  MAX_LOGIN_ATTEMPTS_PER_EMAIL,
  MAX_LOGIN_ATTEMPTS_PER_IP_EMAIL,
  recordFailedAttempt,
} from "./src/lib/auth.ts";

const persistedBlocked = await checkRateLimit(${JSON.stringify(rateKey)}, MAX_LOGIN_ATTEMPTS_PER_IP_EMAIL);
await clearFailedAttempts(${JSON.stringify(rateKey)});
const afterClear = await checkRateLimit(${JSON.stringify(rateKey)}, MAX_LOGIN_ATTEMPTS_PER_IP_EMAIL);

const emailKey = "email:admin@sulpayki.com";
for (let i = 0; i < MAX_LOGIN_ATTEMPTS_PER_EMAIL - 1; i += 1) {
  await recordFailedAttempt(emailKey);
}
const emailCheckBefore20 = await checkRateLimit(emailKey, MAX_LOGIN_ATTEMPTS_PER_EMAIL);
await recordFailedAttempt(emailKey);
const emailCheckAt20 = await checkRateLimit(emailKey, MAX_LOGIN_ATTEMPTS_PER_EMAIL);

const db = getDb();
await db.insert(loginAttempts).values({
  key: "expired-key",
  count: 99,
  resetAt: Date.now() - 5000,
});
const afterExpiryCheck = await checkRateLimit("expired-key", MAX_LOGIN_ATTEMPTS_PER_IP_EMAIL);
await recordFailedAttempt("fresh-key");
const remainingExpired = await db.select().from(loginAttempts).where(eq(loginAttempts.key, "expired-key"));

getLibsqlClient().close();

console.log(JSON.stringify({
  persistedBlocked,
  afterClear,
  emailCheckBefore20,
  emailCheckAt20,
  afterExpiryCheck,
  expiredPrunedCount: remainingExpired.length,
}));
`,
        {
          TURSO_DATABASE_URL: dbUrl,
        }
      );

      assert.equal(proc2.persistedBlocked.allowed, false);
      assert.ok((proc2.persistedBlocked.retryAfterSeconds ?? 0) >= 1);
      assert.equal(proc2.afterClear.allowed, true);
      assert.equal(proc2.emailCheckBefore20.allowed, true);
      assert.equal(proc2.emailCheckAt20.allowed, false);
      assert.ok((proc2.emailCheckAt20.retryAfterSeconds ?? 0) >= 1);
      assert.equal(proc2.afterExpiryCheck.allowed, true);
      assert.equal(proc2.expiredPrunedCount, 0);
    });
  });

  it("getAuthSecret exige AUTH_SECRET (>= 16 chars) cuando process.env.VERCEL está definido", async () => {
    await withTempDir(async (dir) => {
      const dbUrl = pathToFileURL(path.join(dir, "vercel-auth.db")).href;

      for (const badSecret of [undefined, "123456789012345"]) {
        const res = await runIsolatedNodeScript<{ errorMessage: string }>(
          `
import { getLibsqlClient } from "./src/db/client.ts";
import { authenticateUser, createSession } from "./src/lib/auth.ts";

const user = await authenticateUser("admin@sulpayki.com", "VercelAdminPass123!");
let errorMessage = "";
try {
  await createSession(user.id);
} catch (err) {
  errorMessage = err instanceof Error ? err.message : String(err);
}
getLibsqlClient().close();
console.log(JSON.stringify({ errorMessage }));
`,
          {
            TURSO_DATABASE_URL: dbUrl,
            VERCEL: "1",
            INITIAL_SUPERADMIN_PASSWORD: "VercelAdminPass123!",
            AUTH_SECRET: badSecret,
          }
        );
        assert.match(res.errorMessage, /AUTH_SECRET/);
      }

      const validRes = await runIsolatedNodeScript<{
        hasToken: boolean;
        resolvedEmail: string | null;
        invalidCookieUser: unknown;
      }>(
        `
import { getLibsqlClient } from "./src/db/client.ts";
import {
  authenticateUser,
  createSession,
  getUserFromCookies,
  SESSION_COOKIE_NAME,
} from "./src/lib/auth.ts";

const user = await authenticateUser("admin@sulpayki.com", "VercelAdminPass123!");
const session = await createSession(user.id);
const mockCookies = {
  get(name) {
    return name === SESSION_COOKIE_NAME ? { value: session.token } : undefined;
  },
};
const resolved = await getUserFromCookies(mockCookies);
const invalid = await getUserFromCookies({
  get() {
    return { value: "invalid-token" };
  },
});
getLibsqlClient().close();
console.log(JSON.stringify({
  hasToken: session.token.length === 64,
  resolvedEmail: resolved?.email ?? null,
  invalidCookieUser: invalid,
}));
`,
        {
          TURSO_DATABASE_URL: dbUrl,
          VERCEL: "1",
          INITIAL_SUPERADMIN_PASSWORD: "VercelAdminPass123!",
          AUTH_SECRET: "super-strong-vercel-auth-secret-2026",
        }
      );

      assert.equal(validRes.hasToken, true);
      assert.equal(validRes.resolvedEmail, "admin@sulpayki.com");
      assert.equal(validRes.invalidCookieUser, null);
    });
  });
});
