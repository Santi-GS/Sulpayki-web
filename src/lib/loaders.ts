import { strapiClient } from "./strapi-client";

const blocksPopulate = {
  on: {
      "block.hero": {
        populate: {
          links: true,
          carruselHero: {
            populate: {
              card: {
                fields: ["titulo", "text"],
                populate: {
                  imagen: {
                    fields: ["alternativeText", "url"]
                  }
                }
              },
              link: true
            }
          }
        }
      },
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
          populate:{
            respuesta: true,
          }
        }
      }
      },
      "block.bento-info": {
      populate: {
        bentoComponent: {
          populate:{
            link: true,
          }
        }
      }
    },
    "block.destinos-destacados":{
      populate:{
        articulo_destinos:{
          populate: {
          coverImagen:{
            fields: ["alternativeText", "url"]
          },
          tags: true,
          },            
        },
      }
    },
    "block.eventos-destacados":{
      populate:{
      articulo_eventos:{
          populate: {
          coverImagen:{
          fields: ["alternativeText", "url"]
          },
          tags: true,
          },            
        },
      }
    },

  }
};

async function getSingleType(name: string, params: object) {
    const data = await strapiClient.single(name).find(params);
    return data;
  }

async function getLandingPageData() {
    const data = await getSingleType("landing-page", {
      populate: {
        blocks: blocksPopulate,
      },
    });
    return data;
  }
  
  export { getLandingPageData };