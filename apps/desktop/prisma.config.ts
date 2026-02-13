import "dotenv/config";
import { defineConfig } from "prisma/config";

const defaultSqliteUrl = "file:../data/app.db";
const datasourceUrl = process.env["DATABASE_URL"]?.trim() || defaultSqliteUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: datasourceUrl,
  },
});
