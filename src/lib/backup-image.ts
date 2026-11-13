import { isIP } from "node:net";

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function isPrivateOrBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower === "0.0.0.0" ||
    lower === "::1" ||
    lower === "::"
  ) {
    return true;
  }

  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice(7);
    if (isIP(mapped) === 4) {
      return isPrivateOrBlockedHost(mapped);
    }
    if (/^[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(mapped)) {
      const [hi = "0", lo = "0"] = mapped.split(":");
      const high = Number.parseInt(hi, 16);
      const low = Number.parseInt(lo, 16);
      const ipv4 = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
      return isPrivateOrBlockedHost(ipv4);
    }
  }

  const ipVersion = isIP(lower);
  if (ipVersion === 4) {
    const parts = lower.split(".").map((p) => Number.parseInt(p, 10));
    const [a = 0, b = 0] = parts;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }

  if (ipVersion === 6) {
    if (lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80")) {
      return true;
    }
  }

  return false;
}

export function validateExternalImageUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("URL de imagen inválida.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Solo se admiten URLs HTTP/HTTPS para descargar imágenes.");
  }

  if (isPrivateOrBlockedHost(parsed.hostname)) {
    throw new Error("Host de imagen no permitido por seguridad.");
  }

  return parsed;
}

export function normalizeMimeType(rawType: string | null | undefined, urlOrName?: string): string {
  const clean = (rawType || "").split(";")[0]!.trim().toLowerCase();
  if (clean === "image/jpg") return "image/jpeg";
  if (ALLOWED_IMAGE_MIMES.has(clean)) return clean;

  if (urlOrName) {
    const ext = urlOrName.split("?")[0]!.split(".").pop()?.toLowerCase();
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "png") return "image/png";
    if (ext === "webp") return "image/webp";
    if (ext === "avif") return "image/avif";
    if (ext === "gif") return "image/gif";
  }

  return "";
}

async function readStreamWithinLimit(
  response: Response,
  controller: AbortController,
  maxBytes: number
): Promise<Uint8Array<ArrayBuffer>> {
  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const trimmedLen = contentLengthHeader.trim();
    if (/^\d+$/.test(trimmedLen)) {
      const declaredBytes = Number(trimmedLen);
      if (declaredBytes > maxBytes) {
        await response.body?.cancel().catch(() => {});
        controller.abort();
        throw new Error("La imagen supera el límite máximo de 10 MB.");
      }
    }
  }

  if (!response.body) {
    throw new Error("La imagen descargada está vacía.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        controller.abort();
        await reader.cancel("Image exceeds max allowed size").catch(() => {});
        throw new Error("La imagen supera el límite máximo de 10 MB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) {
    throw new Error("La imagen descargada está vacía.");
  }

  const bytes = new Uint8Array(new ArrayBuffer(totalBytes));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function fetchExternalImageAsFile(
  rawUrl: string,
  preferredName?: string
): Promise<{ file: File; contentType: string; bytes: Uint8Array }> {
  let currentUrl = validateExternalImageUrl(rawUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error("Tiempo de espera agotado al descargar la imagen."));
  }, 15000);

  try {
    let response: Response | null = null;

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      const hopResponse = await fetch(currentUrl.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "image/*" },
      });

      if (REDIRECT_STATUSES.has(hopResponse.status)) {
        await hopResponse.body?.cancel().catch(() => {});
        if (redirects >= MAX_REDIRECTS) {
          throw new Error("La descarga de la imagen superó el máximo de redirecciones permitidas.");
        }

        const location = hopResponse.headers.get("location");
        if (!location) {
          throw new Error("La redirección de la imagen no incluye una URL de destino.");
        }

        let resolvedTarget: string;
        try {
          resolvedTarget = new URL(location, currentUrl).toString();
        } catch {
          throw new Error("URL de redirección de imagen inválida.");
        }

        currentUrl = validateExternalImageUrl(resolvedTarget);
        continue;
      }

      response = hopResponse;
      break;
    }

    if (!response) {
      throw new Error("La descarga de la imagen superó el máximo de redirecciones permitidas.");
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new Error(`No se pudo descargar la imagen (${response.status}).`);
    }

    const contentType = normalizeMimeType(
      response.headers.get("content-type"),
      currentUrl.pathname
    );
    if (!contentType || !ALLOWED_IMAGE_MIMES.has(contentType)) {
      await response.body?.cancel().catch(() => {});
      throw new Error(
        "El archivo remoto no es una imagen soportada (JPG, PNG, WebP, AVIF o GIF)."
      );
    }

    const bytes = await readStreamWithinLimit(response, controller, MAX_IMAGE_BYTES);

    const ext = MIME_TO_EXT[contentType] || "webp";
    const baseName =
      preferredName ||
      currentUrl.pathname
        .split("/")
        .pop()
        ?.replace(/[^a-zA-Z0-9._-]/g, "") ||
      `imagen.${ext}`;
    const filename = baseName.includes(".") ? baseName : `${baseName}.${ext}`;

    const file = new File([bytes], filename, { type: contentType });

    return { file, contentType, bytes };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function decodeDataUrlToFile(dataUrl: string, filename?: string): File {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match) {
    throw new Error("Formato de imagen embebida inválido.");
  }

  const contentType = normalizeMimeType(match[1]);
  if (!contentType || !ALLOWED_IMAGE_MIMES.has(contentType)) {
    throw new Error("Tipo de imagen embebida no soportado.");
  }

  const buffer = Buffer.from(match[2]!, "base64");
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("La imagen embebida supera el límite permitido o está vacía.");
  }

  const ext = MIME_TO_EXT[contentType] || "webp";
  const safeName = (filename || `imagen.${ext}`).replace(/[^a-zA-Z0-9._-]/g, "");
  return new File([buffer], safeName.includes(".") ? safeName : `${safeName}.${ext}`, {
    type: contentType,
  });
}
