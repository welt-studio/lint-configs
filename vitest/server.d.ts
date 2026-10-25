import type { SetupServerApi } from "msw/node";

/** Servidor MSW do padrão; o projeto registra os handlers dele com `server.use(...)`. */
export const server: SetupServerApi;
