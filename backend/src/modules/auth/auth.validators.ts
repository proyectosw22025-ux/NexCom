import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(/\d/, "La contraseña debe contener al menos un número");

export const registerSchema = z
  .object({
    email: z.string().email("Email inválido").toLowerCase(),
    password: passwordSchema,
    rol: z.enum(["VENDEDOR", "CLIENTE"], {
      errorMap: () => ({ message: "El rol debe ser VENDEDOR o CLIENTE" }),
    }),
    datosVendedor: z
      .object({
        nombreNegocio: z.string().min(2, "El nombre del negocio debe tener al menos 2 caracteres"),
        descripcion:   z.string().optional(),
        telefono:      z.string().optional(),
        ciudad:        z.string().optional(),
      })
      .optional(),
    datosComprador: z
      .object({
        nombreCompleto: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
        telefono:       z.string().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.rol === "VENDEDOR" && !data.datosVendedor?.nombreNegocio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["datosVendedor", "nombreNegocio"],
        message: "El nombre del negocio es requerido para vendedores",
      });
    }
    if (data.rol === "CLIENTE" && !data.datosComprador?.nombreCompleto) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["datosComprador", "nombreCompleto"],
        message: "El nombre completo es requerido para compradores",
      });
    }
  });

export const loginSchema = z.object({
  email:    z.string().email("Email inválido").toLowerCase(),
  password: z.string().min(1, "La contraseña es requerida"),
});

export type RegisterInput   = z.infer<typeof registerSchema>;
export type LoginInput      = z.infer<typeof loginSchema>;
