import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("ServiceWorkerRegister", () => {
  it("registra el service worker /sw.js cuando el navegador lo soporta", () => {
    const register = vi.fn().mockResolvedValue({});
    vi.stubGlobal("navigator", { serviceWorker: { register } });
    render(<ServiceWorkerRegister />);
    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("no falla si el navegador no soporta service workers", () => {
    vi.stubGlobal("navigator", {}); // sin serviceWorker
    expect(() => render(<ServiceWorkerRegister />)).not.toThrow();
  });
});
