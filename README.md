Claro, acá tenés un `README.md` listo para tu proyecto **Sulpayki**, una página de viajes y turismo enfocada en mostrar rutas y eventos en La Rioja, Argentina:

---

````markdown
# 🌄 Sulpayki - Viajes y Turismo

Bienvenido al repositorio oficial de **Sulpayki**, una página web dedicada a ofrecer información turística sobre las rutas, excursiones y eventos disponibles en la provincia de **La Rioja, Argentina**. A través de esta plataforma, los visitantes podrán descubrir los paisajes únicos del noroeste argentino y conectarse con nuestras redes sociales para más novedades.

## ✨ Características

- Información sobre viajes, rutas y excursiones por La Rioja.
- Calendario de eventos turísticos y culturales.
- Enlaces a nuestras redes sociales.
- Diseño responsive y accesible.
- Desarrollado con **Astro**, **TailwindCSS v4**, y componentes personalizados.

---

## 🚀 Instalación

Este proyecto usa **pnpm** como gestor de paquetes. Si no lo tenés instalado, podés hacerlo con:

```bash
npm install -g pnpm
````

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/sulpayki-website.git
cd sulpayki-website
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Iniciar el servidor de desarrollo

```bash
pnpm dev
```

Esto iniciará la web en `http://localhost:4321`.

---

## 🔗 Redes Sociales

Podés seguirnos y contactarnos a través de nuestras redes oficiales:

* 📸 [Instagram](https://instagram.com/sulpaykiviajes)
* 💬 [WhatsApp](https://wa.me/5493804679492)
* 📧 [Gmail](mailto:sulpaykiviajesyturismo@gmail.com)

---

## 📦 Build para producción

Para compilar el sitio para producción:

bash:
pnpm build


Los archivos estáticos se generarán en la carpeta `dist/`.

---

Claro, aquí tenés una versión resumida y clara para un `README.md`:

---

## 🗺️ Insertar Mapas en Markdown

Este proyecto permite insertar mapas de Google Maps directamente en contenido Markdown usando una sintaxis simple.

### 🔧 Sintaxis Básica

```markdown
[map:URL_DE_GOOGLE_MAPS]
[map:URL_DE_GOOGLE_MAPS|Título del Mapa]
```

* **URL**: debe ser una URL de tipo embed (`https://www.google.com/maps/embed?...`)
* **Título (opcional)**: se usa como título accesible para lectores de pantalla

### 📍 Ejemplo

```markdown
[map:https://www.google.com/maps/embed?pb=...|Nuestra Oficina en La Rioja]
```

### 📐 Características

* Soporta múltiples mapas
* Responsive (ancho 100%, alto 400px)
* Títulos accesibles (`aria-label`)
* Estilo con `rounded-lg`, sombra, y carga diferida (`loading="lazy"`)

### 📝 Cómo obtener la URL

1. Abrí Google Maps
2. Buscá una ubicación
3. Hacé clic en “Compartir” > “Insertar un mapa”
4. Copiá el enlace del iframe

---
## 📝 Licencia

Este proyecto es de uso interno para fines turísticos. Si querés colaborar o tenés ideas, ¡te leemos!

---

> Desarrollado con 🌱 y pasión por el turismo riojano.

