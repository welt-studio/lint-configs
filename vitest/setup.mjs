// Setup do padrão, rodado antes do setup do projeto em todo arquivo de teste.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./server.mjs";

// Rede real em teste reprova: requisição sem handler do projeto é erro, não chamada de verdade.
beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
});

afterEach(() => {
  server.resetHandlers();
  // Sem `globals`, o Testing Library não desmonta sozinho entre os testes.
  cleanup();
});

afterAll(() => {
  server.close();
});
