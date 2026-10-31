import { defineMiddleware } from "astro:middleware";
import { getUserFromCookies } from "./lib/auth";

const SUPERADMIN_PAGE_PREFIXES = ["/admin/usuarios", "/admin/etiquetas", "/admin/sistema"];
const SUPERADMIN_API_PREFIXES = ["/api/admin/users", "/api/admin/tags", "/api/admin/backup"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Las rutas públicas son 100% estáticas (SSG): no leemos cookies ni cabeceras allí
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname.startsWith("/api/admin/");

  if (!isAdminPage && !isAdminApi) {
    return next();
  }

  // Rutas abiertas de login
  if (pathname === "/admin/login") {
    const existingUser = await getUserFromCookies(context.cookies);
    if (existingUser) {
      return context.redirect("/admin");
    }
    context.locals.user = null;
    return next();
  }

  if (pathname === "/api/admin/auth/login") {
    context.locals.user = null;
    return next();
  }

  const user = await getUserFromCookies(context.cookies);
  context.locals.user = user;

  if (!user) {
    if (isAdminApi) {
      return new Response(
        JSON.stringify({ error: "Tu sesión expiró o no iniciaste sesión." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return context.redirect("/admin/login");
  }

  // Verificar permisos exclusivos de SUPERADMIN
  const requiresSuperadminPage = SUPERADMIN_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const requiresSuperadminApi = SUPERADMIN_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if ((requiresSuperadminPage || requiresSuperadminApi) && user.role !== "SUPERADMIN") {
    if (isAdminApi) {
      return new Response(
        JSON.stringify({ error: "No tenés permisos suficientes para realizar esta acción." }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return context.redirect("/admin?notice=sin-permisos");
  }

  const response = await next();
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
});

