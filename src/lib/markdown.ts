import { Marked, type Tokens } from "marked";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const CONTROL_OR_WHITESPACE_REGEX = /[\u0000-\u001F\u007F\s]/;

/**
 * Valida y sanitiza URLs de enlaces (`a[href]`).
 * Permite únicamente http://, https://, mailto:, tel:, o rutas relativas que inicien con /, ./, ../ o #
 * (sin espacios ni caracteres de control). Devuelve "#" si la URL es insegura.
 */
export function sanitizeHref(rawUrl: string | null | undefined): string {
  if (typeof rawUrl !== "string") return "#";
  const trimmed = rawUrl.trim();
  if (!trimmed || CONTROL_OR_WHITESPACE_REGEX.test(trimmed)) return "#";

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return trimmed;
      }
    } catch {
      return "#";
    }
    return "#";
  }

  if (lower.startsWith("mailto:") && trimmed.length > "mailto:".length) {
    return trimmed;
  }

  if (lower.startsWith("tel:") && trimmed.length > "tel:".length) {
    return trimmed;
  }

  if (
    (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../") ||
    trimmed.startsWith("#")
  ) {
    return trimmed;
  }

  return "#";
}

/**
 * Valida y sanitiza URLs de imágenes (`img[src]`).
 * Permite únicamente http://, https:// o rutas relativas que inicien con / (sin // ni /\).
 * Devuelve "" si la URL es insegura.
 */
export function sanitizeImageUrl(rawUrl: string | null | undefined): string {
  if (typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (!trimmed || CONTROL_OR_WHITESPACE_REGEX.test(trimmed)) return "";

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return trimmed;
      }
    } catch {
      return "";
    }
    return "";
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
    return trimmed;
  }

  return "";
}

// Instancia aislada compatible con marked v18+ (evita mutar el singleton global en builds estáticos)
const sulpaykiMarked = new Marked({
  renderer: {
    html({ text }: Tokens.HTML | Tokens.Tag): string {
      return escapeHtml(text ?? "");
    },
    link(token: Tokens.Link): string {
      const safeHref = sanitizeHref(token.href);
      const text = token.tokens?.length
        ? this.parser.parseInline(token.tokens)
        : escapeHtml(token.text ?? "");
      const lowerHref = safeHref.toLowerCase();
      const isExternal = lowerHref.startsWith("http://") || lowerHref.startsWith("https://");
      let attrs = `href="${escapeHtmlAttr(safeHref)}"`;
      if (isExternal) {
        attrs += ` target="_blank" rel="noopener noreferrer"`;
      }
      if (token.title) {
        attrs += ` title="${escapeHtmlAttr(token.title)}"`;
      }
      return `<a ${attrs}>${text}</a>`;
    },
    image(token: Tokens.Image): string {
      const altText = token.tokens
        ? this.parser.parseInline(token.tokens, this.parser.textRenderer)
        : (token.text ?? "");
      const safeSrc = sanitizeImageUrl(token.href);
      if (!safeSrc) {
        return escapeHtml(altText);
      }
      let attrs = `src="${escapeHtmlAttr(safeSrc)}" alt="${escapeHtmlAttr(altText)}"`;
      if (token.title) {
        attrs += ` title="${escapeHtmlAttr(token.title)}"`;
      }
      return `<img ${attrs}>`;
    },
  },
});

const MAP_REGEX = /\[map:(.*?)(?:\|(.*?))?\]/g;

function isSafeGoogleMapsEmbedUrl(url: string): boolean {
  if (!url || /[\u0000-\u001F\u007F\s"'<>]/.test(url)) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.origin === "https://www.google.com" &&
      (parsed.pathname === "/maps/embed" || parsed.pathname.startsWith("/maps/embed/"))
    );
  } catch {
    return false;
  }
}

/**
 * Convierte texto Markdown (incluyendo embeds `[map:URL|Título]` de Google Maps) a HTML seguro.
 */
export function renderMarkdown(rawText: string | null | undefined): string {
  if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
    return "";
  }

  const nonce =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  let placeholderPrefix = `SULPAYKIMAP${nonce}ITEM`;
  while (rawText.includes(placeholderPrefix)) {
    placeholderPrefix += "X";
  }

  const mapEmbeds: Array<{ placeholder: string; html: string }> = [];

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

    if (!isSafeGoogleMapsEmbedUrl(cleanUrl)) {
      return match;
    }

    const safeUrl = escapeHtmlAttr(cleanUrl);
    const safeTitle = escapeHtmlAttr(title || "Ubicación en Google Maps");
    const placeholder = `${placeholderPrefix}${mapEmbeds.length}END`;

    const mapHtml = `<div class="map-container my-6">
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

    mapEmbeds.push({ placeholder, html: mapHtml });
    return `\n\n${placeholder}\n\n`;
  });

  let rendered = sulpaykiMarked.parse(processedText, { async: false });

  for (const { placeholder, html: mapHtml } of mapEmbeds) {
    const wrappedPlaceholder = `<p>${placeholder}</p>`;
    if (rendered.includes(wrappedPlaceholder)) {
      rendered = rendered.replaceAll(wrappedPlaceholder, () => mapHtml);
    }
    if (rendered.includes(placeholder)) {
      rendered = rendered.replaceAll(placeholder, () => mapHtml);
    }
  }

  return rendered;
}

