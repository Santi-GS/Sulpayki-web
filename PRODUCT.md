# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Sulpayki atiende en partes iguales a dos perfiles complementarios:

- **Viajeros particulares, parejas y familias** que planifican escapadas, vacaciones o excursiones por La Rioja y el noroeste argentino, buscando naturaleza imponente, cultura, enoturismo y gastronomía regional con acompañamiento cercano.
- **Grupos institucionales, contingentes educativos y empresas** que requieren circuitos de turismo industrial y productivo (bodegas, olivícolas, polos productivos), traslados seguros, alojamiento y logística coordinada a medida.

## Product Purpose

**Sulpayki Viajes y Turismo** conecta a visitantes e instituciones con las rutas, destinos, paquetes y excursiones de **La Rioja, Argentina**. El sitio permite descubrir visualmente el catálogo real de destinos y experiencias por categoría y derivar reservas o consultas personalizadas de forma directa e inmediata (`Consultar paquete` por WhatsApp y correo electrónico).

El éxito del producto se mide en que el sitio se perciba de inmediato como una **agencia de viajes receptiva cálida, visual y confiable**, permitiendo explorar experiencias reales y abrir conversación contextualizada en segundos.

## Positioning

Agencia de viajes local riojana que combina **atención personalizada ("diseñamos junto a vos tu viaje")** con una especialización dual en la provincia de La Rioja: **turismo receptivo y experiencial** (naturaleza, cultura, ruta del vino Torrontés y gastronomía) y **turismo industrial/productivo y logística grupal**, articulada con organismos oficiales provinciales y municipales.

## Operating Context

- Los viajeros consultan desde celular o escritorio buscando paquetes, excursiones y circuitos concretos, esperando fotografías reales de las salidas y un botón directo `Consultar paquete` hacia WhatsApp (`+54 9 3804 679492`) con el paquete o consulta precargada.
- El equipo interno de Sulpayki administra autónomamente los contenidos desde el panel `/admin` (portada de inicio en `/admin/inicio`, artículos de `SERVICIO` y `DESTINO`, etiquetas, medios e institucional `sobre-nosotros`), publicando cambios sobre Astro + LibSQL/Turso + Vercel.

## Capabilities and Constraints

- **Compatibilidad obligatoria con `/admin/inicio`**: la página de inicio debe seguir consumiendo dinámicamente `getHomeHeroProps()` (`heading`, `links` con tipos `PRIMARY`/`SECONDARY`, y `carruselHero` con diapositivas editables de imagen, título, texto y enlace), además de `getFeaturedArticleItems("SERVICIO")` y `getFeaturedArticleItems("DESTINO")`.
- **Taxonomía oficial activa**: cinco ejes de servicios alineados con la navegación y base de datos (`Turismo de Naturaleza`, `Turismo Industrial`, `Turismo Cultural`, `Gastronomía`, `Transporte`), más las secciones principales (`Inicio`, `Destinos`, `Servicios Turísticos`, `Sobre Nosotros`).
- **Alcance transversal de marca**: la identidad renovada abarca la página de inicio (`/`) y los componentes globales compartidos (`Header`, `Drawer`, `Footer`, `BtnFlotante` y tokens base en `global.css`/`Layout.astro`), sin romper los bloques reutilizados en páginas internas ni el panel `/admin`.
- **Idioma y tono**: español rioplatense (`es-AR`, voseo cercano, turístico, hospitalario y claro).

## Brand Commitments

- **Nombre e isotipo**: **Sulpayki Viajes y Turismo** ("Sulpayki" significa *gracias* en quechua). El logo oficial (`/logo-sulpayki-2.svg`) integra un cardón riojano como letra "Y".
- **Vínculos institucionales reales**: articulación visible en el pie de página con Secretaría de Turismo de La Rioja, Municipalidad de La Rioja y enlaces legales obligatorios de Defensa del Consumidor y Agencia de Viajes de Argentina.
- **Paleta oficial vinculante de 7 colores definida por la marca**:
  - **Marfil (`#F5F0E4`)** — Fondo general del sitio web (`bg-surface` / `bg-canvas`), cálido y descansado a la vista.
  - **Carbón (`#292A24`)** — Tipografía principal, títulos oscuros, bordes de alta definición (`text-primary`, `border-dark`) y cierres profundos.
  - **Oliva Profundo (`#59613A`)** — Color identitario primario: barra de navegación (`Header`), badges de categorías y titulares secundarios.
  - **Verde Salvia (`#89916A`)** — Fondos secundarios para tarjetas, estados hover y divisores suaves.
  - **Terracota (`#A85C45`)** — Botones de acción principales (CTAs, reservas, `"Consultar paquete"`).
  - **Rojo Tierra (`#783D32`)** — Acento secundario para estados activos, etiquetas destacadas y hover de botones principales.
  - **Arena Cálida (`#D8C49A`)** — Contenedores destacados, banners informativos y fondos de secciones alternas.
- **Tipografía oficial vinculante elegida por el usuario** (sans moderna de agencia de viajes, cero aspecto de diario):
  - **Títulos y titulares (`Montserrat`, pesos 600 y 700):** geométrica limpia, luminosa y turística para portadas, nombres de paquetes y destinos.
  - **Cuerpo e interfaz (`Plus Jakarta Sans`, pesos 400, 500 y 600):** sans humanista moderna de alta legibilidad para descripciones, badges, itinerarios y botones de acción.

## Evidence on Hand

- **Activos gráficos existentes**: `/logo-sulpayki-2.svg`, `/logo.svg`, `/favicon.svg`, fotografías reales de excursiones, enoturismo, patrimonio y traslados (`/bus-turistico-gente.webp`, `/estatua-facundo-quiroga.webp`, `/uploads/*`) e imágenes alojadas en Cloudinary cargadas desde la base de datos.
- **Datos reales en base de datos**: diapositivas de portada, servicios turísticos publicados y destinos destacados gestionados en LibSQL/Turso (`src/lib/loaders.ts`).
- **Canales verificados**: WhatsApp `+54 9 3804 679492`, correo `sulpaykiviajesyturismo@gmail.com`, Instagram `@sulpayki_viajesyturismo` y Facebook oficial.
- **Ausencias que no deben inventarse**: no fabricar precios fijos no cargados, calificaciones con estrellas ficticias, testimonios inventados ni métricas comerciales inexistentes.

## Product Principles

1. **Agencia de viajes visual e inmersiva, nunca un diario**: las fotografías reales de paisajes, bodegas, excursiones y viajeros protagonizan cada sección; se descartan muros de texto sin imagen, fechas de publicación tipo blog en tarjetas de paquetes y filetes de periódico.
2. **Del interés a "Consultar paquete" en un clic**: tanto la portada como cada tarjeta de paquete o excursión ofrecen acceso directo a consultar ese circuito específico por WhatsApp además de ver su itinerario completo.
3. **Autonomía editorial intacta**: toda decisión de interfaz en portada y bloques se adapta con elegancia tanto si el equipo carga 1 diapositiva o 5, o 0, 1, 2–3 o 4+ paquetes/destinos destacados desde `/admin`.
4. **Hospitalidad riojana para familias y grupos**: equilibrio claro entre escapadas individuales/familiares y logística integral para instituciones, viajes educativos y turismo industrial.

## Accessibility & Inclusion

- Cumplimiento WCAG 2.2 nivel AA en contraste cromático sobre toda la paleta de 7 colores (`#292A24`, `#59613A`, `#783D32`, `#A85C45`, `#89916A`, `#D8C49A`, `#F5F0E4`), navegación completa por teclado (`:focus-visible`), enlace para saltar al contenido principal, controles táctiles mínimos de 44×44 px y respeto estricto a `prefers-reduced-motion: reduce`.
