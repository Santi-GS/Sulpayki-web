import { Marked, type Tokens } from "marked";

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Instancia aislada compatible con marked v18+ (evita mutar el singleton global en builds estáticos)
const sulpaykiMarked = new Marked({
  renderer: {
    link(token: Tokens.Link): string {
      const href = escapeHtmlAttr(token.href ?? "");
      const text = this.parser.parseInline(token.tokens);
      const isExternal = href.startsWith("http://") || href.startsWith("https://");
      let attrs = `href="${href}"`;
      if (isExternal) {
        attrs += ` target="_blank" rel="noopener noreferrer"`;
      }
      if (token.title) {
        attrs += ` title="${escapeHtmlAttr(token.title)}"`;
      }
      return `<a ${attrs}>${text}</a>`;
    },
  },
});

const MAP_REGEX = /\[map:(.*?)(?:\|(.*?))?\]/g;

/**
 * Convierte texto Markdown (incluyendo embeds `[map:URL|Título]` de Google Maps) a HTML seguro.
 */
export function renderMarkdown(rawText: string | null | undefined): string {
  if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
    return "";
  }

  const processedText = rawText.replace(MAP_REGEX, (match, rawUrl: string, rawTitle = "") => {
    let cleanUrl = rawUrl.trim();
    const title = rawTitle.trim();

    if (cleanUrl.includes("width=") || cleanUrl.includes("height=") || cleanUrl.includes("style=")) {
      const srcMatch = cleanUrl.match(/src="([^"]+)"/);
      if (srcMatch?.[1]) {
        cleanUrl = srcMatch[1];
      } else {
        const urlMatch = cleanUrl.match(/^(https:\/\/www\.google\.com\/maps\/embed\?[^&\s]+)/);
        if (urlMatch?.[1]) {
          cleanUrl = urlMatch[1];
        }
      }
    }

    if (!cleanUrl.startsWith("https://www.google.com/maps/embed")) {
      return match;
    }

    const safeUrl = escapeHtmlAttr(cleanUrl);
    const safeTitle = escapeHtmlAttr(title || "Ubicación en Google Maps");

    return `
<div class="map-container my-6">
  ${title ? `<h3 class="text-lg font-semibold mb-3 text-gray-900">${escapeHtmlAttr(title)}</h3>` : ""}
  <div class="map-wrapper rounded-lg overflow-hidden shadow-lg">
    <iframe
      src="${safeUrl}"
      width="100%"
      height="400"
      style="border:0;"
      allowfullscreen=""
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
      title="${safeTitle}"
    ></iframe>
  </div>
</div>`;
  });

  return sulpaykiMarked.parse(processedText, { async: false });
}

