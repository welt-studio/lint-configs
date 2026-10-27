// Ciclo que só passa por alias: o `import-x/no-cycle` só o vê se o alias resolver.
import { b } from "@/lib/cycle-b";

export function a(): number {
  return b() + 1;
}
