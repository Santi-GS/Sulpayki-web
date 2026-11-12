import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Ingresá un correo electrónico válido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
});

export const heroSlideSchema = z.object({
  id: z.number().int().optional(),
  titulo: z.string().trim().min(1, "Cada diapositiva debe tener un título."),
  text: z.string().trim().default(""),
  imageUrl: z.string().trim().min(1, "Seleccioná una imagen para la diapositiva."),
  imageAlt: z.string().trim().default(""),
  linkHref: z.string().trim().default("/destinos"),
});

export const heroLinkSchema = z.object({
  label: z.string().trim().min(1, "El botón necesita un texto."),
  href: z.string().trim().min(1, "El botón necesita un enlace."),
  type: z.enum(["PRIMARY", "SECONDARY"]).default("PRIMARY"),
  isExternal: z.boolean().default(false),
});

export const homeHeroInputSchema = z.object({
  heading: z.string().trim().min(1, "Ingresá el título principal de la portada."),
  slides: z.array(heroSlideSchema).min(1, "Agregá al menos una diapositiva al carrusel."),
  links: z.array(heroLinkSchema).max(4).default([]),
});

// Bloques visuales permitidos dentro de artículos (Destinos/Servicios) y Sobre Nosotros
const imagenBlockField = z.object({
  id: z.number().optional(),
  documentId: z.string().optional(),
  url: z.string().trim().min(1, "Falta la URL de la imagen."),
  alternativeText: z.string().trim().default(""),
});

const blockEncabezadoSchema = z.object({
  __component: z.literal("block.encabezado-de-seccion"),
  subencabezado: z.string().trim().default("Sulpayki Viajes y Turismo"),
  encabezado: z.string().trim().min(1, "El encabezado de sección requiere un título."),
  anchorLink: z.string().trim().default(""),
});

const blockMarkdownSchema = z.object({
  __component: z.literal("block.markdown"),
  text: z.string().trim().min(1, "El bloque de texto no puede estar vacío."),
});

const blockContenidoImagenSchema = z.object({
  __component: z.literal("block.contenido-con-imagen"),
  titulo: z.string().trim().min(1, "Ingresá un título para el bloque con imagen."),
  texto: z.string().trim().min(1, "Ingresá el texto del bloque con imagen."),
  imagen: imagenBlockField,
  invertido: z.boolean().default(false),
  ajuste: z.enum(["cover", "contain"]).optional().default("cover"),
  link: z
    .object({
      label: z.string().trim().default(""),
      href: z.string().trim().default(""),
      isExternal: z.boolean().default(false),
    })
    .optional(),
});

const blockCarruselImagenesSchema = z.object({
  __component: z.literal("block.carrusel-de-imagenes"),
  imagen: z
    .array(
      z.object({
        imagen: imagenBlockField,
      })
    )
    .min(1, "Agregá al menos una foto a la galería."),
});

const blockPreguntasFrecuentesSchema = z.object({
  __component: z.literal("block.preguntas-frecuentes"),
  pyr: z
    .array(
      z.object({
        id: z.number().optional(),
        pregunta: z.string().trim().min(1, "Escribí la pregunta."),
        respuesta: z.object({
          id: z.number().optional(),
          text: z.string().trim().min(1, "Escribí la respuesta."),
        }),
      })
    )
    .min(1, "Agregá al menos una pregunta frecuente."),
});

export const contentBlockSchema = z.discriminatedUnion("__component", [
  blockEncabezadoSchema,
  blockMarkdownSchema,
  blockContenidoImagenSchema,
  blockCarruselImagenesSchema,
  blockPreguntasFrecuentesSchema,
]);

export const articleInputSchema = z.object({
  type: z.enum(["DESTINO", "SERVICIO"]),
  titulo: z.string().trim().min(2, "Ingresá un título de al menos 2 caracteres."),
  slug: z.string().trim().optional(),
  resumen: z.string().trim().max(320, "El resumen breve no debe superar los 320 caracteres.").default(""),
  descripcion: z.string().default(""),
  coverUrl: z.string().trim().min(1, "Seleccioná o subí una imagen de portada."),
  coverAlt: z.string().trim().default(""),
  published: z.boolean().default(true),
  featured: z.boolean().default(false),
  tagIds: z.array(z.number().int().positive()).default([]),
  blocks: z.array(contentBlockSchema).default([]),
});

export const pageInputSchema = z.object({
  title: z.string().trim().min(2, "Ingresá el título de la página."),
  description: z.string().trim().max(320).default(""),
  blocks: z.array(contentBlockSchema).default([]),
});

export const tagInputSchema = z.object({
  titulo: z.string().trim().min(2, "El nombre de la etiqueta es obligatorio."),
  descripcion: z.string().trim().default(""),
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(2, "Ingresá el nombre del usuario."),
  email: z.email("Ingresá un correo válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  role: z.enum(["SUPERADMIN", "EDITOR"]).default("EDITOR"),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2, "Ingresá el nombre del usuario.").optional(),
  role: z.enum(["SUPERADMIN", "EDITOR"]).optional(),
  password: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres.").optional().or(z.literal("")),
});
