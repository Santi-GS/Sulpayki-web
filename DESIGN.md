---
name: Sulpayki Viajes y Turismo
description: Sistema visual de agencia de viajes receptiva en La Rioja, Argentina, cálido, fotográfico e inmersivo.
colors:
  marfil: "#F5F0E4"
  carbon: "#292A24"
  carbon-muted: "#45473E"
  oliva: "#59613A"
  oliva-deep: "#464D2D"
  salvia: "#89916A"
  salvia-soft: "#E1E3D3"
  terracota: "#A85C45"
  rojo-tierra: "#783D32"
  arena-calida: "#D8C49A"
  cta-ink: "#FFFDF9"
typography:
  display:
    fontFamily: "Montserrat Variable, system-ui, -apple-system, sans-serif"
    fontWeight: 700
    lineHeight: 1.07
    letterSpacing: "-0.028em"
  headline:
    fontFamily: "Montserrat Variable, system-ui, -apple-system, sans-serif"
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Montserrat Variable, system-ui, -apple-system, sans-serif"
    fontWeight: 700
    lineHeight: 1.28
  body:
    fontFamily: "Plus Jakarta Sans Variable, system-ui, -apple-system, sans-serif"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Plus Jakarta Sans Variable, system-ui, -apple-system, sans-serif"
    fontWeight: 600
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.terracota}"
    textColor: "{colors.cta-ink}"
    rounded: "{rounded.md}"
    padding: "14px 24px"
  button-primary-hover:
    backgroundColor: "{colors.rojo-tierra}"
  button-secondary:
    backgroundColor: "{colors.marfil}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.md}"
    padding: "14px 22px"
  button-secondary-hover:
    backgroundColor: "{colors.salvia-soft}"
  badge-category:
    backgroundColor: "{colors.oliva}"
    textColor: "{colors.marfil}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  badge-featured:
    backgroundColor: "{colors.rojo-tierra}"
    textColor: "{colors.marfil}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
---

# Design System: Sulpayki Viajes y Turismo

## Overview

**Creative North Star: "Agencia Receptiva Panorámica Riojana"**

El sistema visual de Sulpayki presenta la agencia como anfitriona cercana de expediciones, circuitos vitivinícolas, naturaleza y logística grupal en La Rioja, Argentina. El diseño rechaza cualquier apariencia de diario, gaceta institucional o muro de texto sin imagen: cada pantalla abre ventanas fotográficas reales al paisaje riojano, organiza las experiencias por ejes claros y ofrece un camino inmediato hacia la reserva o consulta personalizada (`Consultar paquete`).

La atmósfera combina calidez solar y claridad turística moderna mediante una paleta de 7 tonos minerales y botánicos encabezada por el Marfil (`#F5F0E4`) y el Oliva Profundo (`#59613A`), junto a una dupla tipográfica íntegramente sans-serif (`Montserrat` + `Plus Jakarta Sans`) que aporta frescura contemporánea, lectura ágil y carácter inequívoco de agencia de viajes.

**Key Characteristics:**
- **Protagonismo fotográfico de destino:** Escenarios panorámicos y tarjetas de paquetes liderados por imágenes reales de viñedos, excursiones, patrimonio y traslados en La Rioja.
- **Identidad cromática de 7 tonos riojanos:** Navegación y categorías en Oliva Profundo, lienzo descansado en Marfil, contenedores destacados en Arena Cálida, superficies secundarias en Verde Salvia y conversión cálida en Terracota y Rojo Tierra.
- **Tipografía sans moderna de agencia:** Titulares geométricos y limpios en `Montserrat` combinados con `Plus Jakarta Sans` para itinerarios, etiquetas y llamadas a la acción, sin serifas editoriales ni aspecto de periódico.

## Colors

Paleta de 7 colores extraída del paisaje, la vegetación nativa y las formaciones rojizas de La Rioja, con roles de interfaz estrictamente asignados.

### Primary
- **Oliva Profundo** (`#59613A`): Color identitario primario de la marca. Define el logotipo original de Sulpayki en la barra de navegación superior (`Header`), los badges principales de categorías turísticas, el botón maestro del dock flotante y los titulares secundarios de sección.

### Secondary
- **Terracota** (`#A85C45`): Reservado para los botones de acción principales y conversión directa (`Consultar paquete`, reservas por WhatsApp), acompañado de texto claro cálido (`#FFFDF9`) para asegurar contraste WCAG AA (`4.83:1`).
- **Rojo Tierra** (`#783D32`): Acento secundario de alta intensidad empleado en el estado hover de botones Terracota, etiquetas destacadas sobre fotografías, enlaces de acción (`Ver itinerario`), indicadores activos de navegación y el anillo de foco por teclado sobre superficies claras.

### Tertiary
- **Arena Cálida** (`#D8C49A`): Destinado a contenedores destacados (barra flotante de ejes turísticos, banners de viajes a medida), fondos de secciones alternas e ítems seleccionados de navegación.
- **Verde Salvia** (`#89916A`) y **Salvia Suave** (`#E1E3D3`): Empleados en fondos secundarios de tarjetas de paquetes y destinos, estados hover de superficies y divisores suaves (`border-salvia/40`) que reemplazan las líneas duras de periódico.

### Neutral
- **Marfil** (`#F5F0E4`): Fondo general del sitio web (`bg-surface` / `bg-canvas`), cálido y descansado a la vista, compartido también por la barra de navegación superior (`Header`) y el menú lateral móvil (`Drawer`).
- **Carbón** (`#292A24`): Tipografía principal de máxima nitidez (`12.73:1` sobre Marfil y `8.47:1` sobre Arena Cálida), bordes definidos, superposiciones fotográficas cálidas y fondo del pie de página.
- **Carbón Atenuado** (`#45473E`): Tono derivado cálido para descripciones de paquetes y subtítulos (`8.30:1` sobre Marfil), evitando el uso de grises neutros ajenos a la paleta.

### Named Rules
**The Action Terracotta Rule.** El color Terracota (`#A85C45`) con hover a Rojo Tierra (`#783D32`) pertenece exclusivamente a las llamadas a la acción de consulta y reserva (`Consultar paquete`), permitiendo localizar la conversión de un vistazo en cualquier sección.

## Typography

**Display Font:** Montserrat Variable (con respaldo `system-ui, -apple-system, sans-serif`)
**Body Font:** Plus Jakarta Sans Variable (con respaldo `system-ui, -apple-system, sans-serif`)

**Character:** Luminosa, limpia y decididamente turística. `Montserrat` en pesos 600 y 700 otorga presencia moderna a destinos y nombres de paquetes sin evocar prensa escrita, mientras `Plus Jakarta Sans` asegura lectura cómoda en descripciones, chips y controles.

### Hierarchy
- **Display** (700, `2.15rem` a `3.3rem`, line-height 1.07, tracking `-0.028em`): Titular panorámico del Hero sobre fotografía inmersiva.
- **Headline** (700, `1.5rem` a `2.15rem`, line-height 1.18, tracking `-0.025em`): Encabezados de sección en Oliva Profundo y banners de viajes a medida.
- **Title** (700, `1.25rem` a `1.75rem`, line-height 1.28): Títulos de tarjetas de paquetes turísticos, excursiones y destinos.
- **Body** (400, `0.9375rem` a `1.125rem`, line-height 1.6): Resúmenes de recorridos y bajadas descriptivas (medida óptima de `54ch` a `65ch`).
- **Label** (600, `0.75rem` a `0.9375rem`): Botones `Consultar paquete`, enlaces de navegación y badges de categoría sobre imágenes.

### Named Rules
**The No-Kicker & No-Blog-Date Rule.** Ningún encabezado lleva ante-títulos ("eyebrows/kickers") encima, y las tarjetas de paquetes o destinos jamás muestran fechas de publicación estilo diario o blog.

## Layout

El sistema espacial combina apertura panorámica en portada con contenedores centrados de `max-w-7xl` (`1280px`) y márgenes laterales adaptables (`px-4 sm:px-6 lg:px-8`).

- **Primera vista inmersiva:** Barra superior fija en Oliva Profundo (`74px` móvil / `84px` escritorio), seguida de un escenario fotográfico panorámico a ancho completo (`min-h-[540px]` a `620px`) y una barra flotante de 5 ejes turísticos en Arena Cálida (`-mt-10 sm:-mt-12`) que articula la transición hacia el lienzo Marfil.
- **Ritmo de secciones turísticas:** Alternancia orgánica entre lienzo Marfil (`#F5F0E4`), secciones templadas en Arena Cálida (`bg-arena-calida/45`) y contenedores destacados en Oliva Profundo + Arena Cálida, eliminando las líneas divisorias continuas de estilo editorial.
- **Adaptabilidad de catálogo:** Las grillas de paquetes y destinos soportan dinámicamente `0`, `1` (ficha panorámica de 12 columnas), `2–3` (grilla equilibrada) o `4+` ítems (carrusel horizontal desplazable).

## Elevation & Depth

El sistema utiliza una jerarquía híbrida controlada donde cada componente elige un único mecanismo de definición espacial: borde suave en Verde Salvia para tarjetas asentadas o sombra cálida con desplazamiento vertical para barras flotantes y menús.

### Shadow Vocabulary
- **Header Elevation** (`0 12px 30px -12px rgba(41, 42, 36, 0.34)`): Sombra cálida bajo la barra de navegación en Oliva Profundo.
- **Floating Travel Bar & Banner** (`0 20px 44px -16px rgba(41, 42, 36, 0.28)`): Suspensión de la barra de categorías turísticas sobre el Hero y del banner de viajes a medida.
- **Floating Menu & Dock** (`0 18px 40px -12px rgba(41, 42, 36, 0.32)`): Elevación para submenús desplegables, controles de carrusel y accesos flotantes.

### Named Rules
**The Single Elevation Rule.** Cada contenedor declara su elevación una sola vez: o utiliza borde suave (`1px solid` en Verde Salvia/Carbón translúcido) o proyecta sombra con desplazamiento; nunca ambos a la vez.

## Shapes

- **Tarjetas y contenedores turísticos:** Radio amable de `16px` (`rounded-2xl`) con recorte limpio de fotografías (`overflow-hidden`).
- **Botones y enlaces interactivos:** Radio de `12px` (`rounded-xl`) con área táctil mínima de `44px` a `50px`.
- **Badges de categoría y controles circulares:** Píldoras completas (`9999px` / `rounded-full`) reservadas para etiquetas sobre imagen, indicadores de carrusel y botones icónicos.

## Components

### Buttons
- **Shape:** Bordes redondeados de agencia (`12px`), altura mínima de `44px` en tarjetas/barra y `48px–50px` en portadas.
- **Primary (`Consultar paquete`):** Fondo Terracota (`#A85C45`), texto claro cálido (`#FFFDF9`), ícono de WhatsApp integrado; transiciona en hover a Rojo Tierra (`#783D32`).
- **Secondary:** Fondo Marfil (`#F5F0E4`), texto Carbón (`#292A24`); transiciona en hover a Arena Cálida (`#D8C49A`) o Salvia Suave (`#E1E3D3`).

### Chips
- **Badges sobre fotografía:** Píldoras compactas (`rounded-full`, `px-3 py-1`, `12px` semibold) en Oliva Profundo (`#59613A`) para categorías regulares y Rojo Tierra (`#783D32`) para circuitos destacados, siempre ubicadas sobre la esquina fotográfica y nunca como ante-título.

### Cards / Containers
- **Tarjetas de Paquetes y Destinos:** Contenedores `<article>` de `16px` de radio sobre Marfil (`#F5F0E4`) o Salvia Suave (`#E1E3D3`), borde `1px` en Verde Salvia (`border-salvia/45` con hover a `#59613A`), fotografía `16:10` con zoom suave (`scale(1.04)`), divisor interno en Verde Salvia y pie de doble acción (`Ver itinerario` + botón Terracota `Consultar paquete` con mensaje de WhatsApp contextualizado al título del paquete).

### Navigation
- **Barra Principal (`Header`):** Cabecera fija con ocultamiento inteligente al bajar y reaparición al subir, fondo Marfil claro (`#F5F0E4`) con ligero desenfoque óptico en sintonía con el Drawer, isotipo y logotipo original de Sulpayki en su color oliva auténtico (`#586037` / `#59613A`), enlaces en Carbón con indicador activo en Rojo Tierra, submenú en Marfil y CTA `Consultar paquete` en Terracota.
- **Menú Móvil (`Drawer`):** Panel lateral accesible en Marfil con cierre por tecla `Escape`, gestión de `inert`, ítems activos en Arena Cálida y CTA inferior de ancho completo.

### Postal Hero e Indicador de Propuesta
Postal interactiva de esquina (`bg-carbon/76`) con contenedor de texto a cota fija (`min-h-[92px] sm:min-h-[96px]`) para que variaciones de longitud en títulos o bajadas descriptivas mantengan el enlace `Ver propuesta` y la botonera de navegación siempre a una altura fija e invariable.

### Barra Flotante de Ejes Turísticos
Componente insignia que cabalga el borde inferior del Hero panorámico sobre un contenedor en Arena Cálida (`#D8C49A`), presentando las cinco especialidades de Sulpayki (`Naturaleza`, `Ruta Productiva`, `Cultura Viva`, `Gastronomía`, `Traslados`) con medallones icónicos en Oliva Profundo que viran a Rojo Tierra al interactuar.

## Do's and Don'ts

### Do:
- **Do** liderar cada sección y bloque de acceso con fotografías reales de destinos, viñedos, excursiones o viajeros en La Rioja.
- **Do** respetar los roles exactos de la paleta de 7 colores: Marfil (`#F5F0E4`) de base, Oliva Profundo (`#59613A`) en navbar y categorías, Terracota (`#A85C45`) en CTAs `Consultar paquete`, Rojo Tierra (`#783D32`) en activos/hover, Verde Salvia (`#89916A` / `#E1E3D3`) en tarjetas secundarias/divisores y Arena Cálida (`#D8C49A`) en destacados.
- **Do** utilizar `focus-visible:outline-arena-calida` sobre fondos oscuros (`#59613A` y `#292A24`) para preservar visibilidad nítida del foco por teclado.
- **Do** conservar compatibilidad íntegra con los datos dinámicos de `/admin/inicio` y del catálogo de servicios y destinos.

### Don't:
- **Don't** maquetar bloques solo de texto con listas de definiciones, líneas finas continuas o serifas que hagan parecer el sitio la página de un diario.
- **Don't** mostrar fechas de publicación en las tarjetas de paquetes turísticos o destinos de portada.
- **Don't** colocar ante-títulos ("kickers/eyebrows") por encima de `h1`, `h2` o `h3`, ni bordes laterales coloreados mayores a `1px`.
- **Don't** anidar enlaces `<a>` dentro de otros `<a>` al combinar enlaces de itinerario con botones de WhatsApp en una misma tarjeta.
