import { sqliteTable, integer, text, primaryKey, uniqueIndex } from "drizzle-orm/sqlite-core";

export type UserRole = "SUPERADMIN" | "EDITOR";
export type ArticleType = "DESTINO" | "SERVICIO";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<UserRole>().notNull().default("EDITOR"),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const homeHero = sqliteTable("home_hero", {
  id: integer("id").primaryKey(),
  heading: text("heading").notNull(),
  linksJson: text("links_json").notNull().default("[]"),
  slidesJson: text("slides_json").notNull().default("[]"),
  updatedAt: text("updated_at").notNull(),
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  titulo: text("titulo").notNull().unique(),
  slug: text("slug").notNull().unique(),
  descripcion: text("descripcion").notNull().default(""),
});

export const articles = sqliteTable(
  "articles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type").$type<ArticleType>().notNull(),
    titulo: text("titulo").notNull(),
    slug: text("slug").notNull(),
    resumen: text("resumen").notNull().default(""),
    descripcion: text("descripcion").notNull().default(""),
    coverUrl: text("cover_url").notNull().default(""),
    coverAlt: text("cover_alt").notNull().default(""),
    published: integer("published", { mode: "boolean" }).notNull().default(true),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    blocksJson: text("blocks_json").notNull().default("[]"),
    publishedAt: text("published_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("articles_type_slug_idx").on(table.type, table.slug)]
);

export const articleTags = sqliteTable(
  "article_tags",
  {
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.articleId, table.tagId] })]
);

export const pages = sqliteTable("pages", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  blocksJson: text("blocks_json").notNull().default("[]"),
  updatedAt: text("updated_at").notNull(),
});

export const media = sqliteTable("media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  publicId: text("public_id").notNull(),
  url: text("url").notNull(),
  altText: text("alt_text").notNull().default(""),
  width: integer("width").notNull().default(800),
  height: integer("height").notNull().default(600),
  createdAt: text("created_at").notNull(),
});

export const siteState = sqliteTable("site_state", {
  id: integer("id").primaryKey(),
  hasPendingChanges: integer("has_pending_changes", { mode: "boolean" }).notNull().default(false),
  lastPublishedAt: text("last_published_at"),
});

