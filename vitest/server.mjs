// Servidor MSW do padrão: toda requisição de rede num teste passa por ele. O projeto registra os
// handlers dele com `server.use(...)`; requisição sem handler reprova o teste (`setup.mjs`).
import { setupServer } from "msw/node";

export const server = setupServer();
