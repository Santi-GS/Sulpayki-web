import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function getEnv(key: string): string | undefined {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const val = metaEnv?.[key] || process.env[key];
  return val && val.trim().length > 0 ? val.trim() : undefined;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    getEnv("CLOUDINARY_CLOUD_NAME") &&
      getEnv("CLOUDINARY_API_KEY") &&
      getEnv("CLOUDINARY_API_SECRET")
  );
}

export interface UploadedImageResult {
  publicId: string;
  url: string;
  width: number;
  height: number;
}

export async function uploadImageFile(file: File): Promise<UploadedImageResult> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Formato de imagen no soportado. Subí un archivo JPG, PNG, WebP, AVIF o GIF.");
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new Error("La imagen supera el tamaño máximo permitido de 10 MB.");
  }

  const cloudName = getEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = getEnv("CLOUDINARY_API_KEY");
  const apiSecret = getEnv("CLOUDINARY_API_SECRET");
  const folder = getEnv("CLOUDINARY_FOLDER") || "sulpayki";

  if (cloudName && apiKey && apiSecret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    // Firma alfabética requerida por la API de Cloudinary: folder=...&timestamp=... + apiSecret
    const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("folder", folder);
    formData.append("signature", signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error("Cloudinary upload error:", response.status, errBody);
      throw new Error("No se pudo subir la imagen a Cloudinary. Revisá las credenciales configuradas.");
    }

    const payload = (await response.json()) as {
      public_id: string;
      secure_url: string;
      width?: number;
      height?: number;
    };

    return {
      publicId: payload.public_id,
      url: payload.secure_url,
      width: payload.width ?? 1200,
      height: payload.height ?? 800,
    };
  }

  // En producción (Vercel) requerimos Cloudinary para persistencia fuera del sistema de archivos efímero
  if (process.env.VERCEL) {
    throw new Error(
      "Cloudinary no está configurado. Agregá CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en las variables de entorno de Vercel."
    );
  }

  // Fallback cómodo para desarrollo local sin conexión/cuenta aún creada
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "webp";
  const safeName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadsDir, safeName), buffer);

  return {
    publicId: `local-${safeName}`,
    url: `/uploads/${safeName}`,
    width: 1200,
    height: 800,
  };
}

export async function deleteCloudinaryImage(publicId: string): Promise<void> {
  if (!publicId || publicId.startsWith("local-")) {
    return;
  }

  const cloudName = getEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = getEnv("CLOUDINARY_API_KEY");
  const apiSecret = getEnv("CLOUDINARY_API_SECRET");
  if (!cloudName || !apiKey || !apiSecret) return;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");

  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);

  await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: "POST",
    body: formData,
  }).catch((err) => {
    console.warn("Advertencia al eliminar imagen en Cloudinary:", err);
  });
}

