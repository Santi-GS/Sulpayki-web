import { getStrapiURL } from "./index";

const STRAPI_HOST = getStrapiURL();
const STRAPI_TOKEN = import.meta.env.VITE_STRAPI_TOKEN;

if (!STRAPI_TOKEN) {
  console.warn('No se ha configurado VITE_STRAPI_TOKEN en las variables de entorno');
}

const BASE_API_URL = STRAPI_HOST + "/api";

// Cliente personalizado para Strapi
const strapiClient = {
  single: (name: string) => ({
    find: async (params: object) => {
      const url = new URL(`${BASE_API_URL}/${name}`);
      if (params) {
        url.search = new URLSearchParams(params as any).toString();
      }
      const headers = {
        'Content-Type': 'application/json',
        ...(STRAPI_TOKEN ? { 'Authorization': `Bearer ${STRAPI_TOKEN}` } : {})
      };
      const response = await fetch(url.toString(), { headers });
      if (!response.ok) {
        throw new Error(`Error en la petición a Strapi: ${response.statusText}`);
      }
      return response.json();
    }
  })
};

export { STRAPI_HOST, STRAPI_TOKEN, strapiClient };