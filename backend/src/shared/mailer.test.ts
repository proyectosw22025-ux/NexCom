import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock del transporter de nodemailer (evita SMTP real)
const { sendMailMock } = vi.hoisted(() => ({ sendMailMock: vi.fn().mockResolvedValue({}) }));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail: sendMailMock }) },
}));

// Mock de la cola
vi.mock("./queue.js", () => ({ encolarEmail: vi.fn() }));

import { encolarEmail } from "./queue.js";
import { sendVerificationEmail } from "./mailer.js";

describe("mailer — encola con fallback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("encola el email (no envía inline) cuando la cola está disponible", async () => {
    vi.mocked(encolarEmail).mockResolvedValue(undefined);

    await sendVerificationEmail("user@test.com", "tok123");

    expect(encolarEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(encolarEmail).mock.calls[0][0]).toMatchObject({ to: "user@test.com" });
    expect(sendMailMock).not.toHaveBeenCalled(); // no envío directo
  });

  it("cae a envío directo si la cola falla (resiliencia)", async () => {
    vi.mocked(encolarEmail).mockRejectedValue(new Error("Redis caído"));

    await sendVerificationEmail("user@test.com", "tok123");

    expect(encolarEmail).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(1); // fallback ejecutado
  });
});
