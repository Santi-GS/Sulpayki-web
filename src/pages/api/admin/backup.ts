import type { APIRoute } from "astro";
import type { z } from "zod";
import {
  BackupValidationError,
  backupImportRequestSchema,
  backupSnapshotSchema,
  buildBackupSnapshot,
  restoreBackupSnapshot,
} from "../../../lib/backup";

export const prerender = false;

function formatBackupValidationError(error: z.ZodError, fallback: string): string {
  const issue = error.issues[0];
  if (!issue) return fallback;
  if (issue.code === "custom" && issue.message) {
    return issue.message;
  }
  if (
    issue.message &&
    !/^(Invalid|Too small|Too big|Expected|Unrecognized)/i.test(issue.message)
  ) {
    return issue.message;
  }
  const pathLabel = issue.path.length > 0 ? ` (${issue.path.join(".")})` : "";
  return `${fallback}${pathLabel}`;
}

export const GET: APIRoute = async ({ url }) => {
  const snapshot = await buildBackupSnapshot();
  const inline = url.searchParams.get("inline") === "1";
  const dateStamp = new Date().toISOString().slice(0, 10);

  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
  };
  if (!inline) {
    headers["Content-Disposition"] = `attachment; filename="sulpayki-respaldo-${dateStamp}.json"`;
  }

  return new Response(JSON.stringify(snapshot, null, 2), {
    status: 200,
    headers,
  });
};

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const rawBody: unknown = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return new Response(
        JSON.stringify({ error: "El contenido JSON enviado no es válido." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Soportar tanto { snapshot, mode } como el JSON directo del respaldo
    let mode: "replace" | "merge" =
      url.searchParams.get("mode") === "merge" ? "merge" : "replace";
    let snapshotData: z.infer<typeof backupSnapshotSchema>;

    if ("snapshot" in rawBody) {
      const parsedReq = backupImportRequestSchema.safeParse(rawBody);
      if (!parsedReq.success) {
        return new Response(
          JSON.stringify({
            error: formatBackupValidationError(
              parsedReq.error,
              "La estructura del respaldo JSON no es válida."
            ),
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      mode = parsedReq.data.mode;
      snapshotData = parsedReq.data.snapshot;
    } else {
      const parsedSnapshot = backupSnapshotSchema.safeParse(rawBody);
      if (!parsedSnapshot.success) {
        return new Response(
          JSON.stringify({
            error: formatBackupValidationError(
              parsedSnapshot.error,
              "El archivo de respaldo no coincide con el formato de Sulpayki."
            ),
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      snapshotData = parsedSnapshot.data;
    }

    const restored = await restoreBackupSnapshot(snapshotData, mode);

    return new Response(
      JSON.stringify({
        ok: true,
        mode,
        restored,
        message: "Respaldo implementado correctamente en la base de datos.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    if (err instanceof BackupValidationError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Backup restore error:", err);
    const message =
      err instanceof Error ? err.message : "No se pudo restaurar el respaldo.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
