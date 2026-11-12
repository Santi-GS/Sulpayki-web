# Graph Report - Sulpayki-web  (2026-11-11)

## Corpus Check
- 103 files · ~44,351 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 432 nodes · 967 edges · 30 communities (19 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3d542730`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- getDb
- types.ts
- loaders.ts
- package.json
- destroySessionFromCookies
- AdminLayout.astro
- validators.ts
- inicio.astro
- ArticleEditorForm.astro
- Layout.astro
- Icon.astro
- allowBuilds
- tsconfig.json
- Markdown.astro
- Icon.astro
- BlockRenderer.astro
- StrapiImage.astro
- MediaPickerModal.astro
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
- `getStaticPaths()` --calls--> `getAllPages()`  [EXTRACTED]
  src/pages/[slug]/index.astro → src/lib/loaders.ts
- `FullArticle` --references--> `ArticleType`  [EXTRACTED]
  src/lib/loaders.ts → src/db/schema.ts
- `FullArticle` --references--> `BlockData`  [EXTRACTED]
  src/lib/loaders.ts → src/lib/types.ts
- `authenticateUser()` --calls--> `getDb()`  [EXTRACTED]
  src/lib/auth.ts → src/db/client.ts

## Import Cycles
- None detected.

## Communities (30 total, 11 thin omitted)

### Community 0 - "getDb"
Cohesion: 0.08
Nodes (67): astro, bcryptjs, drizzle-orm, getDatabaseUrl(), getDb(), getEnv(), getLibsqlClient(), isUsingRemoteTurso() (+59 more)

### Community 1 - "types.ts"
Cohesion: 0.15
Nodes (15): { data, cardSurface }, Props, Props, Base, CarruselDeImagenesProps, ContenidoConImagenProps, DestacadosProps, DestinosDestacadosProps (+7 more)

### Community 2 - "loaders.ts"
Cohesion: 0.14
Nodes (24): Props, FullArticle, getFeaturedArticleItems(), getPublishedArticles(), getRelatedArticleItems(), mapArticleToDestacadoItem(), StoredHeroSlide, stripMarkdownPreview() (+16 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, astro@^7.4.3, @astrojs/vercel@^11.0.17, bcryptjs@^3.0.3, drizzle-orm@^0.45.4, @fontsource-variable/fraunces@^5.3.0, @fontsource-variable/plus-jakarta-sans@^5.3.0, @libsql/client@^0.18.0 (+32 more)

### Community 5 - "destroySessionFromCookies"
Cohesion: 0.18
Nodes (10): clearSessionCookie(), destroySessionFromCookies(), getAuthSecret(), getUserFromCookies(), hashToken(), onRequest, SUPERADMIN_API_PREFIXES, SUPERADMIN_PAGE_PREFIXES (+2 more)

### Community 6 - "AdminLayout.astro"
Cohesion: 0.05
Nodes (36): cloudinaryReady, editorLinks, Props, remoteTurso, superadminLinks, ALLOWED_MIME_TYPES, deleteCloudinaryImage(), getEnv() (+28 more)

### Community 7 - "validators.ts"
Cohesion: 0.10
Nodes (23): authenticateUser(), checkRateLimit(), clearFailedAttempts(), createSession(), recordFailedAttempt(), setSessionCookie(), blockCarruselImagenesSchema, blockContenidoImagenSchema (+15 more)

### Community 8 - "inicio.astro"
Cohesion: 0.23
Nodes (11): availableLinkGroups, basePages, destinos, escapeAttr(), initHeroEditor(), renderLinkOptions(), renderLinks(), renderSlides() (+3 more)

### Community 9 - "ArticleEditorForm.astro"
Cohesion: 0.09
Nodes (16): initArticleForm(), Props, slugifyLocal(), TagOption, createDefaultBlock(), escapeAttr(), initBlocksEditor(), render() (+8 more)

### Community 10 - "Layout.astro"
Cohesion: 0.07
Nodes (15): @fontsource-variable/montserrat@^5.3.0, @fontsource-variable/montserrat, Props, currentYear, LINKS, NavItems, NavItems, linksInfo (+7 more)

### Community 11 - "Icon.astro"
Cohesion: 0.12
Nodes (12): ejesOficiales, Props, tagsDeServicios, tagsUnicos, IconMap, iconMap, iconName, icons (+4 more)

### Community 12 - "allowBuilds"
Cohesion: 0.40
Nodes (4): allowBuilds, sharp, @vercel/speed-insights, nodeLinker

### Community 13 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): astro/tsconfigs/strict, exclude, extends, include

### Community 25 - "Markdown.astro"
Cohesion: 0.19
Nodes (10): hasValidData, isSvgImage, isWhatsappLink, Props, html, Props, escapeHtmlAttr(), renderMarkdown() (+2 more)

### Community 26 - "Icon.astro"
Cohesion: 0.29
Nodes (6): Props, getHomeHeroProps(), BentoInfoProps, encabezadoDestinos, encabezadoServicios, fixedBentoData

### Community 29 - "BlockRenderer.astro"
Cohesion: 0.29
Nodes (6): componentMap, BlockData, ComponentType, getStaticPaths(), prerender, Props

### Community 30 - "StrapiImage.astro"
Cohesion: 0.15
Nodes (8): ejesTuristicos, hasWhatsappInLinks, Props, imageUrl, Props, HeroProps, id, prerender

### Community 32 - "MediaPickerModal.astro"
Cohesion: 0.90
Nodes (4): bindModalEvents(), getElements(), loadMediaGrid(), showStatus()

### Community 34 - "PaqueteCard.astro"
Cohesion: 0.33
Nodes (4): { data }, grupos, Props, TarjetaPaqueteTuristicoProps

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 189 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `getDb` to `loaders.ts`, `destroySessionFromCookies`, `AdminLayout.astro`, `validators.ts`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `getDb` be split into smaller, more focused modules?**
  _Cohesion score 0.08003442340791739 - nodes in this community are weakly interconnected._
- **Why does `ensureDatabaseInitialized()` connect `getDb` to `loaders.ts`, `destroySessionFromCookies`, `AdminLayout.astro`, `validators.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14619883040935672 - nodes in this community are weakly interconnected._
- **Why does `drizzle-orm` connect `getDb` to `loaders.ts`, `package.json`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `loaders.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.135632183908046 - nodes in this community are weakly interconnected._