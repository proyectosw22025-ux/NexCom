import type { PrismaClient } from "@prisma/client";

const USUARIO_INCLUDE = {
  perfilVendedor: {
    select: { id: true, nombreNegocio: true, ciudad: true, ratingPromedio: true, totalVentas: true, totalResenias: true },
  },
  perfilComprador: {
    select: { id: true, nombreCompleto: true, telefono: true },
  },
} as const;

export const adminRepository = {
  async findAllUsuarios(
    { rol, activo }: { rol?: string; activo?: boolean },
    pagina: number,
    limite: number,
    prisma: PrismaClient,
  ) {
    const where = {
      ...(rol ? { rol: rol as "ADMIN" | "VENDEDOR" | "COMPRADOR" } : {}),
      ...(activo !== undefined ? { activo } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        include: USUARIO_INCLUDE,
        orderBy: { creadoEn: "desc" },
        skip:  (pagina - 1) * limite,
        take:  limite,
      }),
      prisma.usuario.count({ where }),
    ]);
    return { items, total, pagina, totalPaginas: Math.ceil(total / limite) };
  },

  async findById(id: string, prisma: PrismaClient) {
    return prisma.usuario.findUnique({ where: { id }, include: USUARIO_INCLUDE });
  },

  async toggleActivo(id: string, prisma: PrismaClient) {
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id } });
    return prisma.usuario.update({
      where: { id },
      data:  { activo: !usuario.activo },
      include: USUARIO_INCLUDE,
    });
  },

  async updateRol(id: string, rol: string, prisma: PrismaClient) {
    return prisma.usuario.update({
      where: { id },
      data:  { rol: rol as "ADMIN" | "VENDEDOR" | "COMPRADOR" },
      include: USUARIO_INCLUDE,
    });
  },
};
