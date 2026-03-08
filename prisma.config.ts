import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    provider: "sqlite",
    url: "file:./prisma/dev.db",
  },

  migrations: {
    seed: "tsx prisma/seed.ts",
  },

  migrate: {
    adapter: {
      provider: "sqlite",
      url: "file:./prisma/dev.db",
    },
  },
});