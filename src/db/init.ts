import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { getDb, getLibsqlClient, isUsingRemoteTurso } from "./client";
import { articles, articleTags, homeHero, media, pages, siteState, tags, users } from "./schema";
import { slugify } from "../lib/index";

function getOptionalEnv(key: string): string | undefined {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const val = metaEnv?.[key] || process.env[key];
  return val && val.trim().length > 0 ? val.trim() : undefined;
}

function getEnv(key: string, fallback: string): string {
  return getOptionalEnv(key) ?? fallback;
}

let initPromise: Promise<void> | null = null;

async function runSchemaAndSeed(): Promise<void> {
  const client = getLibsqlClient();

  // Fast-path para cold starts: evitar DDL y lecturas de seed si el esquema (incluida login_attempts) ya existe
  try {
    const [stateRes, userRes, attemptsRes] = await client.batch(
      [
        "SELECT id FROM site_state WHERE id = 1 LIMIT 1",
        "SELECT id FROM users LIMIT 1",
        "SELECT 1 FROM login_attempts LIMIT 1",
      ],
      "read"
    );
    if (
      (stateRes?.rows?.length ?? 0) > 0 &&
      (userRes?.rows?.length ?? 0) > 0 &&
      attemptsRes !== undefined
    ) {
      return;
    }
  } catch {
    // Alguna tabla aún no existe: continuar con creación de esquema y seed inicial
  }

  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'EDITOR',
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS home_hero (
        id INTEGER PRIMARY KEY,
        heading TEXT NOT NULL,
        links_json TEXT NOT NULL DEFAULT '[]',
        slides_json TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        descripcion TEXT NOT NULL DEFAULT ''
      );`,
      `CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        titulo TEXT NOT NULL,
        slug TEXT NOT NULL,
        resumen TEXT NOT NULL DEFAULT '',
        descripcion TEXT NOT NULL DEFAULT '',
        cover_url TEXT NOT NULL DEFAULT '',
        cover_alt TEXT NOT NULL DEFAULT '',
        published INTEGER NOT NULL DEFAULT 1,
        featured INTEGER NOT NULL DEFAULT 0,
        blocks_json TEXT NOT NULL DEFAULT '[]',
        published_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS articles_type_slug_idx ON articles(type, slug);`,
      `CREATE TABLE IF NOT EXISTS article_tags (
        article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (article_id, tag_id)
      );`,
      `CREATE TABLE IF NOT EXISTS pages (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        blocks_json TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_id TEXT NOT NULL,
        url TEXT NOT NULL,
        alt_text TEXT NOT NULL DEFAULT '',
        width INTEGER NOT NULL DEFAULT 800,
        height INTEGER NOT NULL DEFAULT 600,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS site_state (
        id INTEGER PRIMARY KEY,
        has_pending_changes INTEGER NOT NULL DEFAULT 0,
        last_published_at TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS login_attempts (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        reset_at INTEGER NOT NULL
      );`,
    ],
    "write"
  );

  const db = getDb();
  const now = new Date().toISOString();

  // 1. Estado global de publicación
  const existingState = await db.select().from(siteState).where(eq(siteState.id, 1)).limit(1);
  if (existingState.length === 0) {
    await db.insert(siteState).values({
      id: 1,
      hasPendingChanges: false,
      lastPublishedAt: now,
    });
  }

  // 2. Usuarios iniciales (Superadmin + Editor opcional para el cliente)
  const [{ value: userCount }] = await db.select({ value: count() }).from(users);
  if (userCount === 0) {
    const superEmail = getEnv("INITIAL_SUPERADMIN_EMAIL", "admin@sulpayki.com").toLowerCase();
    const configuredSuperPass = getOptionalEnv("INITIAL_SUPERADMIN_PASSWORD");
    if (process.env.VERCEL && !configuredSuperPass) {
      throw new Error(
        "INITIAL_SUPERADMIN_PASSWORD debe estar configurada en las variables de entorno de Vercel para crear el usuario Superadmin inicial."
      );
    }
    const superPass = configuredSuperPass || "SulpaykiAdmin2026!";
    const superName = getEnv("INITIAL_SUPERADMIN_NAME", "Administrador General");
    const superHash = await bcrypt.hash(superPass, 10);

    const initialUsers: (typeof users.$inferInsert)[] = [
      {
        email: superEmail,
        name: superName,
        passwordHash: superHash,
        role: "SUPERADMIN",
        createdAt: now,
      },
    ];

    // En producción (Vercel / Turso), solo se crea el editor si definís explícitamente INITIAL_EDITOR_EMAIL e INITIAL_EDITOR_PASSWORD.
    // En entorno local de pruebas (sin Turso remoto ni Vercel) se crea por defecto para permitir probar ambos roles.
    const defaultEditorEmail =
      isUsingRemoteTurso() || process.env.VERCEL ? "" : "cliente@sulpayki.com";
    const editorEmail = getEnv("INITIAL_EDITOR_EMAIL", defaultEditorEmail).toLowerCase();
    const configuredEditorPass = getOptionalEnv("INITIAL_EDITOR_PASSWORD");
    const editorPass = process.env.VERCEL
      ? configuredEditorPass
      : configuredEditorPass || "SulpaykiEditor2026!";
    const editorName = getEnv("INITIAL_EDITOR_NAME", "Equipo Sulpayki");

    if (editorEmail && editorEmail.length > 0 && editorPass && editorPass.length > 0) {
      const editorHash = await bcrypt.hash(editorPass, 10);
      initialUsers.push({
        email: editorEmail,
        name: editorName,
        passwordHash: editorHash,
        role: "EDITOR",
        createdAt: now,
      });
    }

    await db.insert(users).values(initialUsers);
  }

  // 3. Etiquetas oficiales alineadas con el menú de Header.astro
  const [{ value: tagCount }] = await db.select({ value: count() }).from(tags);
  if (tagCount === 0) {
    const initialTags = [
      { titulo: "Turismo de Naturaleza", descripcion: "Paisajes naturales, parques y reservas de La Rioja." },
      { titulo: "Turismo Industrial", descripcion: "Visitas guiadas a polos productivos, bodegas y olivícolas." },
      { titulo: "Turismo Cultural", descripcion: "Historia, tradiciones, museos y patrimonio riojano." },
      { titulo: "Gastronomía", descripcion: "Sabores regionales, rutas del vino Torrontés y experiencias culinarias." },
      { titulo: "Transporte", descripcion: "Traslados privados, excursiones grupales y logística turística." },
    ];
    await db.insert(tags).values(
      initialTags.map((t) => ({
        titulo: t.titulo,
        slug: slugify(t.titulo),
        descripcion: t.descripcion,
      }))
    );
  }

  // 4. Hero inicial de la Página de Inicio
  const existingHero = await db.select().from(homeHero).where(eq(homeHero.id, 1)).limit(1);
  if (existingHero.length === 0) {
    const initialSlides = [
      {
        id: 1,
        titulo: "Descubrí los paisajes de La Rioja",
        text: "Excursiones personalizadas, naturaleza imponente y atención cercana en cada recorrido.",
        imageUrl: "/bus-turistico-gente.webp",
        imageAlt: "Viajeros disfrutando una excursión con Sulpayki Viajes y Turismo",
        linkHref: "/destinos",
      },
      {
        id: 2,
        titulo: "Historia, cultura y turismo industrial",
        text: "Conocé nuestras raíces, circuitos productivos y experiencias auténticas del noroeste argentino.",
        imageUrl: "/estatua-facundo-quiroga.webp",
        imageAlt: "Patrimonio histórico y cultural de La Rioja",
        linkHref: "/servicios-turisticos",
      },
    ];

    const initialLinks = [
      {
        label: "Explorar Servicios",
        href: "/servicios-turisticos",
        type: "PRIMARY",
        isExternal: false,
      },
      {
        label: "Conocer Destinos",
        href: "/destinos",
        type: "SECONDARY",
        isExternal: false,
      },
    ];

    await db.insert(homeHero).values({
      id: 1,
      heading: "Diseñamos junto a vos tu viaje inolvidable por La Rioja",
      linksJson: JSON.stringify(initialLinks),
      slidesJson: JSON.stringify(initialSlides),
      updatedAt: now,
    });
  }

  // 5. Página Sobre Nosotros inicial
  const existingAbout = await db.select().from(pages).where(eq(pages.slug, "sobre-nosotros")).limit(1);
  if (existingAbout.length === 0) {
    const aboutBlocks = [
      {
        __component: "block.encabezado-de-seccion",
        subencabezado: "Sulpayki Viajes y Turismo",
        encabezado: "Nuestra Historia y Propósito",
        anchorLink: "historia",
      },
      {
        __component: "block.contenido-con-imagen",
        titulo: "Pasión por mostrar lo mejor de nuestra tierra",
        texto:
          "En **Sulpayki Viajes y Turismo** diseñamos experiencias pensadas para conectar a cada viajero con la identidad natural, cultural y productiva de **La Rioja, Argentina**.\n\nAcompañamos tanto a visitantes individuales como a delegaciones, instituciones y empresas con traslados seguros, alojamiento y circuitos a medida.",
        imagen: {
          id: 1,
          documentId: "seed-logo",
          url: "/logo-sulpayki-2.svg",
          alternativeText: "Logo oficial de Sulpayki Viajes y Turismo",
        },
        link: {
          label: "Ver servicios turísticos",
          href: "/servicios-turisticos",
          isExternal: false,
        },
        invertido: false,
        ajuste: "contain",
      },
      {
        __component: "block.preguntas-frecuentes",
        pyr: [
          {
            id: 1,
            pregunta: "¿Realizan viajes y excursiones a medida para grupos?",
            respuesta: {
              id: 1,
              text: "Sí, organizamos itinerarios personalizados para familias, contingentes educativos, eventos corporativos y turismo industrial en toda la provincia.",
            },
          },
          {
            id: 2,
            pregunta: "¿Cómo puedo solicitar una cotización o reservar?",
            respuesta: {
              id: 2,
              text: "Podés comunicarte directamente por WhatsApp desde cualquiera de nuestros destinos o servicios para recibir asesoramiento inmediato.",
            },
          },
        ],
      },
    ];

    await db.insert(pages).values({
      slug: "sobre-nosotros",
      title: "Sobre Nosotros",
      description:
        "Conocé a Sulpayki Viajes y Turismo, agencia especializada en experiencias personalizadas, turismo industrial, cultural y naturaleza en La Rioja.",
      blocksJson: JSON.stringify(aboutBlocks),
      updatedAt: now,
    });
  }

  // 6. Biblioteca de medios base + artículos iniciales de muestra si la tabla está vacía
  const [{ value: mediaCount }] = await db.select({ value: count() }).from(media);
  if (mediaCount === 0) {
    await db.insert(media).values([
      {
        publicId: "local-bus-turistico",
        url: "/bus-turistico-gente.webp",
        altText: "Excursión grupal con Sulpayki Viajes y Turismo",
        width: 800,
        height: 800,
        createdAt: now,
      },
      {
        publicId: "local-facundo-quiroga",
        url: "/estatua-facundo-quiroga.webp",
        altText: "Circuito histórico cultural en La Rioja",
        width: 800,
        height: 800,
        createdAt: now,
      },
    ]);
  }

  const [{ value: articleCount }] = await db.select({ value: count() }).from(articles);
  if (articleCount === 0) {
    const allTags = await db.select().from(tags);
    const findTag = (name: string) => allTags.find((t) => t.titulo === name);

    const [insertedServicio] = await db
      .insert(articles)
      .values({
        type: "SERVICIO",
        titulo: "Circuito de Turismo Industrial y Productivo",
        slug: "circuito-turismo-industrial-productivo",
        resumen:
          "Recorridos guiados por bodegas tradicionales, olivícolas y establecimientos productivos emblemáticos de La Rioja.",
        descripcion:
          "Descubrí el corazón productivo riojano a través de visitas guiadas especializadas.\n\n### ¿Qué incluye este servicio?\n- Coordinación integral y guía local especializado.\n- Traslado confortable desde tu alojamiento.\n- Degustación de productos regionales.\n\nConsultanos por salidas grupales, institucionales y educativas.",
        coverUrl: "/bus-turistico-gente.webp",
        coverAlt: "Grupo de viajeros en circuito turístico de Sulpayki",
        published: true,
        featured: true,
        blocksJson: JSON.stringify([]),
        publishedAt: now,
        updatedAt: now,
      })
      .returning();

    const [insertedDestino] = await db
      .insert(articles)
      .values({
        type: "DESTINO",
        titulo: "Ciudad de La Rioja y Circuito Histórico",
        slug: "ciudad-de-la-rioja-circuito-historico",
        resumen:
          "Un recorrido por la historia, arquitectura, plazas y monumentos emblemáticos de la capital riojana.",
        descripcion:
          "Explorá los rincones históricos y culturales más representativos de la **Ciudad de La Rioja**.\n\nVisitamos sus museos, peñas tradicionales, paseos artesanales y puntos panorámicos al pie del Velasco.",
        coverUrl: "/estatua-facundo-quiroga.webp",
        coverAlt: "Monumento histórico en la Ciudad de La Rioja",
        published: true,
        featured: true,
        blocksJson: JSON.stringify([]),
        publishedAt: now,
        updatedAt: now,
      })
      .returning();

    const tagIndustrial = findTag("Turismo Industrial");
    const tagCultural = findTag("Turismo Cultural");

    if (insertedServicio && tagIndustrial) {
      await db.insert(articleTags).values({
        articleId: insertedServicio.id,
        tagId: tagIndustrial.id,
      });
    }
    if (insertedDestino && tagCultural) {
      await db.insert(articleTags).values({
        articleId: insertedDestino.id,
        tagId: tagCultural.id,
      });
    }
  }
}

export async function ensureDatabaseInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = runSchemaAndSeed().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

