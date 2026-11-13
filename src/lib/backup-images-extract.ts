export interface BackupImageItem {
  url: string;
  altText: string;
  sources?: string[];
}

export function safeParseJsonArray<T = unknown>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * Recorre bloques de contenido (contenido-con-imagen y carrusel-de-imagenes)
 * invocando al visitante por cada URL de imagen no vacía encontrada.
 */
export function walkBlockImages(
  blocks: unknown[],
  visitor: (url: string, altText: string, updateUrl: (nextUrl: string) => void) => void
): void {
  for (const rawBlock of blocks) {
    if (!rawBlock || typeof rawBlock !== "object") continue;
    const block = rawBlock as Record<string, unknown>;

    // block.contenido-con-imagen -> block.imagen = { url, alternativeText }
    if (block.imagen && typeof block.imagen === "object" && !Array.isArray(block.imagen)) {
      const img = block.imagen as Record<string, unknown>;
      if (typeof img.url === "string" && img.url.trim()) {
        visitor(
          img.url.trim(),
          typeof img.alternativeText === "string" ? img.alternativeText : "",
          (nextUrl) => {
            img.url = nextUrl;
          }
        );
      }
    }

    // block.carrusel-de-imagenes -> block.imagen = [{ imagen: { url, alternativeText } }]
    if (Array.isArray(block.imagen)) {
      for (const item of block.imagen) {
        if (!item || typeof item !== "object") continue;
        const entry = item as Record<string, unknown>;
        const nested =
          entry.imagen && typeof entry.imagen === "object" && !Array.isArray(entry.imagen)
            ? (entry.imagen as Record<string, unknown>)
            : entry;
        if (typeof nested.url === "string" && nested.url.trim()) {
          visitor(
            nested.url.trim(),
            typeof nested.alternativeText === "string" ? nested.alternativeText : "",
            (nextUrl) => {
              nested.url = nextUrl;
            }
          );
        }
      }
    }
  }
}

/**
 * Extrae las referencias de imágenes de un respaldo.
 * Si backup.images contiene elementos válidos, retorna esa lista filtrada;
 * de lo contrario extrae URLs únicas desde media, homeHero, articles y pages.
 */
export function extractBackupImageItems(backup: {
  media?: Array<{ url?: string; altText?: string }>;
  homeHero?: Array<{ slidesJson?: string }>;
  articles?: Array<{
    type?: string;
    slug?: string;
    coverUrl?: string;
    coverAlt?: string;
    blocksJson?: string;
  }>;
  pages?: Array<{ slug?: string; blocksJson?: string }>;
  images?: BackupImageItem[];
}): BackupImageItem[] {
  if (!backup || typeof backup !== "object") {
    return [];
  }

  if (Array.isArray(backup.images)) {
    const validImages = backup.images
      .filter(
        (item): item is BackupImageItem =>
          Boolean(
            item &&
              typeof item === "object" &&
              typeof item.url === "string" &&
              item.url.trim().length > 0
          )
      )
      .map((item) => ({
        url: item.url.trim(),
        altText: typeof item.altText === "string" ? item.altText : "",
        ...(Array.isArray(item.sources)
          ? { sources: item.sources.filter((s): s is string => typeof s === "string") }
          : {}),
      }));

    if (validImages.length > 0) {
      return validImages;
    }
  }

  const map = new Map<string, BackupImageItem>();

  const register = (rawUrl: unknown, source: string, rawAltText?: unknown) => {
    if (typeof rawUrl !== "string") return;
    const cleanUrl = rawUrl.trim();
    if (!cleanUrl) return;
    const altText = typeof rawAltText === "string" ? rawAltText : "";
    const existing = map.get(cleanUrl);
    if (existing) {
      if (existing.sources && !existing.sources.includes(source)) {
        existing.sources.push(source);
      }
      if (!existing.altText && altText) {
        existing.altText = altText;
      }
      return;
    }
    map.set(cleanUrl, {
      url: cleanUrl,
      altText,
      sources: [source],
    });
  };

  for (const row of backup.media ?? []) {
    if (!row || typeof row !== "object") continue;
    register(row.url, "media", row.altText);
  }

  for (const hero of backup.homeHero ?? []) {
    if (!hero || typeof hero !== "object") continue;
    const slides = safeParseJsonArray<Record<string, unknown>>(hero.slidesJson);
    slides.forEach((slide, idx) => {
      if (!slide || typeof slide !== "object") return;
      const alt =
        (typeof slide.imageAlt === "string" && slide.imageAlt) ||
        (typeof slide.titulo === "string" ? slide.titulo : "");
      register(slide.imageUrl, `hero:slide-${idx + 1}`, alt);
    });
  }

  for (const article of backup.articles ?? []) {
    if (!article || typeof article !== "object") continue;
    const tag = `article:${article.type || "ARTICLE"}:${article.slug || "unknown"}`;
    register(article.coverUrl, `${tag}:cover`, article.coverAlt);
    const blocks = safeParseJsonArray<unknown>(article.blocksJson);
    walkBlockImages(blocks, (url, altText) => {
      register(url, `${tag}:block`, altText);
    });
  }

  for (const page of backup.pages ?? []) {
    if (!page || typeof page !== "object") continue;
    const tag = `page:${page.slug || "unknown"}:block`;
    const blocks = safeParseJsonArray<unknown>(page.blocksJson);
    walkBlockImages(blocks, (url, altText) => {
      register(url, tag, altText);
    });
  }

  return Array.from(map.values());
}
