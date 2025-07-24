export interface Imagen {
    id: number;
    documentId: string;
    url: string;
    alternativeText: string;
  }
  
  export interface Logo {
    id: number;
    logoText: string;
    logoLink: string;
    imagen: Imagen;
  }
  
  export interface Link {
    href: string;
    label?: string;
    isExternal?: boolean;
    isButtonLink?: boolean;
    type?: "PRIMARY" | "SECONDARY";
  }

  export interface LinkSimple {
    href: string;
    label?: string;
  }

  export interface Tags {
    titulo: string;
    descripcion: string;
  }
  
  export interface GlobalPageHeader {
    logo: Logo;
    navItems: Link[];
    cta: Link;
  }
  
  export interface GlobalPageFooter {
    logo: Logo;
    navItems: Link[];
    socialLinks: Logo[];
    text: string;
  }
  
  export type ComponentType =
    | "block.hero"
    | "block.encabezado-de-seccion"
    | "block.contenido-con-imagen"
    | "block.markdown"
    | "block.preguntas-frecuentes"
    | "block.bento-info"
    | "block.destinos-destacados"
    | "block.servicios-destacados"
    | "block.carrusel-de-imagenes"
    | "block.tarjeta-paquete-turistico";
  
  export interface Base<
    T extends ComponentType,
    D extends object = Record<string, unknown>
  > {
    id?: number;
    __component: T;
    documentId?: string;
    createdAt?: string;
    updatedAt?: string;
    publishedAt?: string;
    data?: D;
  }
  
  export interface HeroProps extends Base<"block.hero"> {
    heading: string;
    links: Link[];
    carruselHero: {
      id: number;
      card: {
        id: number;
        titulo: string;
        text: string;
        imagen: Imagen;
      };
      link: LinkSimple;
    }[];
  }
  
  export interface EncabezadoDeSeccionProps extends Base<"block.encabezado-de-seccion"> {
    subencabezado: string;
    encabezado: string;
    anchorLink: string;
  }

  export interface ContenidoConImagenProps extends Base<"block.contenido-con-imagen"> {
    titulo: string;
    texto: string;
    link: Link;
    imagen: Imagen;
    invertido: boolean;
  }

  export interface MarkdownProps extends Base<"block.markdown"> {
    text: string;
  }

  export interface PreguntasFrecuentesProps extends Base<"block.preguntas-frecuentes"> {
    pyr: {
      id: number;
      pregunta: string;
      respuesta: {
        id: number;
        text: string;
      };
    }[];
  }

  export interface BentoInfoProps extends Base<"block.bento-info"> {
    bentoComponent: {
      titulo: string;
      link: LinkSimple;
      }[];
  }

export interface ArticulosDestacadosItem {
  id: number;
  documentId: string;
  titulo: string;
  descripcion: string;
  publishedAt: string;
  updatedAt: string;
  slug: string;
  coverImagen: Imagen;
  tags: Tags[];
}

export interface DestacadosProps<T extends ComponentType> extends Base<T> {
  items?: ArticulosDestacadosItem[];
  articulo_destinos?: ArticulosDestacadosItem[];
  servicio_de_turismos?: ArticulosDestacadosItem[];
}

// Alias para compatibilidad retroactiva
export type DestinosDestacadosProps = DestacadosProps<"block.destinos-destacados">;
export type ServiciosDestacadosProps = DestacadosProps<"block.servicios-destacados">;
export type TarjetaPaqueteTuristicoProps = DestacadosProps<"block.tarjeta-paquete-turistico">;

export interface CarruselDeImagenesProps extends Base<"block.carrusel-de-imagenes"> {
  imagen: {
      imagen:Imagen;
  }[];
}
  
  export type BlockData =
    | HeroProps
    | EncabezadoDeSeccionProps
    | ContenidoConImagenProps
    | MarkdownProps
    | PreguntasFrecuentesProps
    | BentoInfoProps
    | DestinosDestacadosProps
    | ServiciosDestacadosProps
    | CarruselDeImagenesProps
    | TarjetaPaqueteTuristicoProps;