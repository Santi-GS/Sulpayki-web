# Graph Report - Sulpayki-web  (2026-11-12)

## Corpus Check
- 103 files · ~44,524 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 433 nodes · 968 edges · 29 communities (18 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c90e9cdf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- getDb
- types.ts
- loaders.ts
- package.json
- auth.ts
- media/index.ts
- validators.ts
- inicio.astro
- loaders.ts
- Layout.astro
- Header.astro
- allowBuilds
- tsconfig.json
- BlocksEditor.astro
- Markdown.astro
- Icon.astro
- BlockRenderer.astro
- PaqueteCard.astro

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 51 edges
2. `ensureDatabaseInitialized()` - 46 edges
3. `astro` - 18 edges
4. `markPendingSiteChanges()` - 16 edges
5. `drizzle-orm` - 15 edges
6. `getPublishedArticles()` - 13 edges
7. `FullArticle` - 10 edges
8. `getAllArticlesForAdmin()` - 10 edges
9. `Base` - 9 edges
10. `slugify()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `getStaticPaths()` --calls--> `getPublishedArticles()`  [EXTRACTED]
  src/pages/servicios-turisticos/[...page].astro → src/lib/loaders.ts
- `authenticateUser()` --calls--> `ensureDatabaseInitialized()`  [EXTRACTED]
  src/lib/auth.ts → src/db/init.ts
- `createSession()` --calls--> `ensureDatabaseInitialized()`  [EXTRACTED]
  src/lib/auth.ts → src/db/init.ts
- `destroySessionFromCookies()` --calls--> `ensureDatabaseInitialized()`  [EXTRACTED]
  src/lib/auth.ts → src/db/init.ts
- `getUserFromCookies()` --calls--> `ensureDatabaseInitialized()`  [EXTRACTED]
  src/lib/auth.ts → src/db/init.ts

## Import Cycles
- None detected.

## Communities (29 total, 11 thin omitted)

### Community 0 - "getDb"
Cohesion: 0.08
Nodes (65): astro, drizzle-orm, getDatabaseUrl(), getDb(), getEnv(), getLibsqlClient(), isUsingRemoteTurso(), ensureDatabaseInitialized() (+57 more)

### Community 1 - "types.ts"
Cohesion: 0.15
Nodes (16): ejesTuristicos, hasWhatsappInLinks, Props, Props, Base, CarruselDeImagenesProps, ContenidoConImagenProps, DestacadosProps (+8 more)

### Community 2 - "loaders.ts"
Cohesion: 0.15
Nodes (18): Props, getFeaturedArticleItems(), getPublishedArticles(), getRelatedArticleItems(), ArticulosDestacadosItem, EncabezadoDeSeccionProps, encabezadoExperiencias, getStaticPaths() (+10 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (41): dependencies, astro@^7.4.3, @astrojs/vercel@^11.0.17, bcryptjs@^3.0.3, drizzle-orm@^0.45.4, @fontsource-variable/fraunces@^5.3.0, @fontsource-variable/plus-jakarta-sans@^5.3.0, @libsql/client@^0.18.0 (+33 more)

### Community 5 - "auth.ts"
Cohesion: 0.11
Nodes (26): sessions, UserRole, App, AuthenticatedUser, Locals, @vercel/speed-insights/astro, authenticateUser(), checkRateLimit() (+18 more)

### Community 6 - "media/index.ts"
Cohesion: 0.11
Nodes (15): ALLOWED_MIME_TYPES, deleteCloudinaryImage(), getEnv(), isCloudinaryConfigured(), UploadedImageResult, uploadImageFile(), getAllMedia(), destinos (+7 more)

### Community 7 - "validators.ts"
Cohesion: 0.13
Nodes (14): blockCarruselImagenesSchema, blockContenidoImagenSchema, blockEncabezadoSchema, blockMarkdownSchema, blockPreguntasFrecuentesSchema, contentBlockSchema, heroLinkSchema, heroSlideSchema (+6 more)

### Community 8 - "inicio.astro"
Cohesion: 0.23
Nodes (11): availableLinkGroups, basePages, destinos, escapeAttr(), initHeroEditor(), renderLinkOptions(), renderLinks(), renderSlides() (+3 more)

### Community 9 - "loaders.ts"
Cohesion: 0.06
Nodes (37): initArticleForm(), Props, slugifyLocal(), TagOption, ejesOficiales, Props, tagsDeServicios, tagsUnicos (+29 more)

### Community 10 - "Layout.astro"
Cohesion: 0.09
Nodes (18): @fontsource-variable/montserrat@^5.3.0, @fontsource-variable/montserrat, bindModalEvents(), getElements(), loadMediaGrid(), showStatus(), about, fixedTitle (+10 more)

### Community 11 - "Header.astro"
Cohesion: 0.13
Nodes (6): Props, currentYear, LINKS, NavItems, NavItems, linksInfo

### Community 12 - "allowBuilds"
Cohesion: 0.40
Nodes (4): allowBuilds, sharp, @vercel/speed-insights, nodeLinker

### Community 13 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): astro/tsconfigs/strict, exclude, extends, include

### Community 24 - "BlocksEditor.astro"
Cohesion: 0.28
Nodes (6): createDefaultBlock(), escapeAttr(), initBlocksEditor(), render(), Props, prerender

### Community 25 - "Markdown.astro"
Cohesion: 0.18
Nodes (11): hasValidData, isLogoOrGraphic, isSvgImage, isWhatsappLink, Props, html, Props, escapeHtmlAttr() (+3 more)

### Community 26 - "Icon.astro"
Cohesion: 0.16
Nodes (10): Props, IconMap, iconMap, iconName, icons, resolvedClass, BentoInfoProps, encabezadoDestinos (+2 more)

### Community 30 - "BlockRenderer.astro"
Cohesion: 0.13
Nodes (10): { data, cardSurface }, Props, componentMap, imageUrl, Props, ComponentType, DestinosDestacadosProps, ServiciosDestacadosProps (+2 more)

### Community 34 - "PaqueteCard.astro"
Cohesion: 0.33
Nodes (4): { data }, grupos, Props, TarjetaPaqueteTuristicoProps

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 190 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `getDb` to `loaders.ts`, `loaders.ts`, `auth.ts`, `media/index.ts`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `getDb` be split into smaller, more focused modules?**
  _Cohesion score 0.07507002801120448 - nodes in this community are weakly interconnected._
- **Why does `ensureDatabaseInitialized()` connect `getDb` to `loaders.ts`, `loaders.ts`, `auth.ts`, `media/index.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14619883040935672 - nodes in this community are weakly interconnected._
- **Why does `drizzle-orm` connect `getDb` to `loaders.ts`, `package.json`, `auth.ts`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05858585858585859 - nodes in this community are weakly interconnected._