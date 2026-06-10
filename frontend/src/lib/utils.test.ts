import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("combina clases simples", () => {
    expect(cn("px-2", "text-sm")).toBe("px-2 text-sm");
  });

  it("ignora valores falsy", () => {
    expect(cn("px-2", false && "hidden", undefined, null, "text-sm")).toBe("px-2 text-sm");
  });

  it("resuelve clases de Tailwind en conflicto (gana la última)", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("aplica clases condicionales con objetos", () => {
    expect(cn("base", { "bg-red-500": true, "bg-blue-500": false })).toBe("base bg-red-500");
  });
});
