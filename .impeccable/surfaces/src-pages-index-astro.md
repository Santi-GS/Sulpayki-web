---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: ["src/components/BrandLogo.astro","public/favicon.svg","src/pages/servicios-turisticos/[...page].astro","src/pages/servicios-turisticos/[slug].astro","src/pages/destinos/[...page].astro","src/pages/destinos/[slug].astro","src/pages/[slug]/index.astro","src/pages/404.astro","src/components/FiltroServicios.astro","src/components/blocks/ArticulosDestacados.astro","src/components/blocks/EncabezadoDeSeccion.astro","src/components/blocks/ContenidoConImagen.astro","src/components/blocks/Markdown.astro","src/components/blocks/PreguntasFrecuentes.astro","src/components/CardPregunta.astro","src/components/blocks/CarruselImagenes.astro","src/components/blocks/PaqueteCard.astro","src/layouts/Layout.astro","src/styles/global.css"]
---

# Sitio Público — Sulpayki Viajes y Turismo

- **Mode:** Persuade
- **Scope:** Rediseño integral de portada (`src/pages/index.astro`), páginas secundarias (`/servicios-turisticos`, `/servicios-turisticos/[slug]`, `/destinos`, `/destinos/[slug]`, `/[slug]` / `/sobre-nosotros`, `/404`), bloques de contenido (`FiltroServicios`, `ContenidoConImagen`, `Markdown`, `PreguntasFrecuentes`, `CardPregunta`, `CarruselImagenes`, `PaqueteCard`) y nuevo favicon adaptativo del cardón (`public/favicon.svg`) bajo el sistema visual de agencia de viajes receptiva en La Rioja.
- **Audience & Job:** Viajeros particulares/familias y coordinadores de grupos institucionales o corporativos que buscan paquetes, excursiones y circuitos reales en La Rioja, desean explorar itinerarios detallados con recomendaciones automáticas de servicios/destinos relacionados al pie y pulsar `"Consultar paquete"` directo por WhatsApp con el nombre del servicio o destino precargado.
- **Proof & Constraints:** Datos dinámicos de `/admin` (`SERVICIO`, `DESTINO`, `pages` como `sobre-nosotros`), recomendaciones automáticas priorizando misma categoría/etiqueta y destacados (excluyendo el artículo actual), botones directos de WhatsApp con mensaje precargado, favicon SVG del cactus con `#586037` en tema claro y `#D8C49A` (Arena Cálida) en tema oscuro (`prefers-color-scheme: dark`), sin fechas de publicación tipo blog ni ante-títulos ("kickers").

## Direction contract

THESIS: El sitio completo funciona como una agencia de viajes receptiva panorámica y hospitalaria en La Rioja donde cada catálogo, ficha de itinerario y página institucional abre ventanas fotográficas al paisaje riojano, facilita filtrar experiencias reales, sugiere circuitos relacionados al pie de cada artículo y canaliza la reserva directa por WhatsApp sin fricción ni aspecto de periódico.

OWN-WORLD: Lienzo descansado en Marfil (`#F5F0E4`) alternado con secciones y contenedores destacados en Arena Cálida (`#D8C49A`) y tarjetas secundarias en Salvia Suave (`#E1E3D3`) con bordes de `1px` en Verde Salvia (`#89916A`), identidad primaria en Oliva Profundo (`#59613A`), tipografía nítida en Carbón (`#292A24`), acentos activos en Rojo Tierra (`#783D32`) y llamadas a la acción `"Consultar paquete"` exclusivamente en Terracota (`#A85C45` con hover a `#783D32`), vestidas con `Montserrat` (600/700) y `Plus Jakarta Sans` (400/500/600) sobre contenedores de agencia con radio `16px`.

STORY: El visitante explora el catálogo de paquetes o destinos filtrando por especialidad turística, abre el itinerario completo con fotografía protagonista y resumen de viaje, consulta disponibilidad en un clic por WhatsApp con el nombre del paquete/destino precargado y descubre automáticamente al pie otras experiencias destacadas o de la misma categoría para continuar armando su recorrido por La Rioja.

FIRST VIEWPORT: En catálogos (`/servicios-turisticos` y `/destinos`), cabecera panorámica de agencia con fotografía e identidad en Oliva Profundo/Carbón, buscador y píldoras interactivas por eje turístico en `/servicios-turisticos` o vitrina destacada en `/destinos`, dando paso inmediato a tarjetas fotográficas de paquetes sin fechas de blog y con doble acción (`Ver itinerario` / `Ver destino` + `Consultar paquete`). En fichas de artículo (`/servicios-turisticos/[slug]` y `/destinos/[slug]`), portada inmersiva con imagen principal, etiquetas de categoría, titular en `Montserrat`, resumen de viaje y tarjeta de consulta directa por WhatsApp seguida del itinerario y del carrusel/grilla automática de propuestas recomendadas.

FORM: Agencia Receptiva Panorámica Riojana; `seed:fed24644e6f4a92b`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
