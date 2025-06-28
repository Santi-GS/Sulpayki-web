import { strapiClient } from "./lib/strapi-client";
import type { Loader } from "astro/loaders";
import { defineCollection } from "astro:content";
import { strapiLoader } from "strapi-community-astro-loader";

const blocksPopulate = {
  on: {
    "block.encabezado-de-seccion": true,
    "block.contenido-con-imagen": {
      populate: {
        link: true,
        imagen: {
          fields: ["alternativeText", "url"]
        }
      }
    },
    "block.markdown": true,
    "block.preguntas-frecuentes": {
      populate: {
        pyr: {
          populate: {
            respuesta: true,
          }
        }
      }
    },
  },
};

const strapiArticle = defineCollection({
  loader: strapiLoader({
    contentType: "article",
     params: {
      populate: {
        coverImagen: {
          fields: ["url", "alternativeText"],
        },
        tags: {
          populate: "*",
        },
        blocks: blocksPopulate,
      },
    },
  }) as unknown as Loader,
});

const strapiPages = defineCollection({
  loader: strapiLoader({
    contentType: "pagina",
    params: {
      populate: {
        blocks: blocksPopulate,
      },
    },
  }) as unknown as Loader,
});

export const collections = {
  strapiArticle,
  strapiPages,
};