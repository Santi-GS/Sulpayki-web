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
    /*| "blocks.card-grid"
    | "blocks.person-card"
    | "blocks.newsletter"*/;
  
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
    text: string;
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
      imagen: Imagen;
      }[];
  }

 export interface ArticulosDestacadosProps extends Base<"block.destinos-destacados"> {
    articulo_destinos: {
      id: number;
      documentId: string;
      titulo: string;
      descripcion: string;
      link: Link;
      publishedAt: string;
      updatedAt: string;
      slug: string;
      coverImagen: Imagen;
      tags: Tags[];
    }[];
  }
  
  /*export interface CardGridProps extends Base<"blocks.card-grid"> {
    card: {
      id: number;
      heading: string;
      text: string;
      image: Image;
    }[];
  }
  
  export interface PersonCardProps extends Base<"blocks.person-card"> {
    personName: string;
    personJob: string;
    image: Image;
    text: string;
  }
  
  
  export interface NewsletterProps extends Base<"blocks.newsletter"> {
    heading: string;
    text: string;
    placeholder: string;
    label: string;
    formId: string;
  }*/
  
  export type BlockData =
    | HeroProps
    | EncabezadoDeSeccionProps
    | ContenidoConImagenProps
    | MarkdownProps
    | PreguntasFrecuentesProps
    | BentoInfoProps
    | ArticulosDestacadosProps
    /*
    | CardGridProps
    | PersonCardProps
    | FeaturedArticlesProps
    | NewsletterProps*/;