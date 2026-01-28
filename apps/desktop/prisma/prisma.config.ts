import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrate: {
    // DB locale du desktop (dans apps/data/app.db)
    url: "file:../data/app.db",
  },
});
