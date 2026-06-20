import { describe, it, expect, vi } from "vitest";
import crypto from "crypto";

// Mock del env con credenciales de prueba
vi.mock("../config/env.js", () => ({
  env: {
    CLOUDINARY_CLOUD_NAME: "demo-cloud",
    CLOUDINARY_API_KEY:    "123456789",
    CLOUDINARY_API_SECRET: "secreto-test",
  },
}));

import { firmarSubida, cloudinaryConfigurado, CLOUDINARY_FOLDER } from "./cloudinary.js";

describe("cloudinary.firmarSubida", () => {
  it("detecta que está configurado", () => {
    expect(cloudinaryConfigurado()).toBe(true);
  });

  it("genera una firma SHA-1 válida sobre folder+timestamp+secret (sin exponer el secret)", () => {
    const r = firmarSubida();
    expect(r).toMatchObject({ cloudName: "demo-cloud", apiKey: "123456789", folder: CLOUDINARY_FOLDER });
    // El secret NO se devuelve al cliente
    expect(JSON.stringify(r)).not.toContain("secreto-test");
    // La firma es reproducible con la misma fórmula que usa Cloudinary
    const esperada = crypto.createHash("sha1")
      .update(`folder=${r.folder}&timestamp=${r.timestamp}secreto-test`)
      .digest("hex");
    expect(r.signature).toBe(esperada);
  });
});
