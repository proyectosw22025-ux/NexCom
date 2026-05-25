import type { PrismaClient } from "@prisma/client";

function mapDireccion(d: {
  id: string;
  alias: string;
  destinatario: string;
  calle: string;
  zona: string | null;
  ciudad: string;
  departamento: string;
  referencia: string | null;
  esPrincipal: boolean;
}) {
  return {
    id:           d.id,
    alias:        d.alias,
    destinatario: d.destinatario,
    calle:        d.calle,
    zona:         d.zona,
    ciudad:       d.ciudad,
    departamento: d.departamento,
    referencia:   d.referencia,
    esPrincipal:  d.esPrincipal,
  };
}

export const direccionesRepository = {
  async findByComprador(compradorId: string, prisma: PrismaClient) {
    const dirs = await prisma.direccion.findMany({
      where:   { compradorId, activo: true },
      orderBy: [{ esPrincipal: "desc" }, { id: "asc" }],
    });
    return dirs.map(mapDireccion);
  },

  async findById(id: string, prisma: PrismaClient) {
    const d = await prisma.direccion.findUnique({ where: { id } });
    return d ? mapDireccion(d) : null;
  },

  async create(
    compradorId: string,
    data: {
      alias: string;
      destinatario: string;
      calle: string;
      zona?: string | null;
      ciudad?: string;
      departamento?: string;
      referencia?: string | null;
      esPrincipal?: boolean;
    },
    prisma: PrismaClient,
  ) {
    const esPrincipal = data.esPrincipal ?? false;
    return prisma.$transaction(async (tx) => {
      if (esPrincipal) {
        await tx.direccion.updateMany({
          where: { compradorId, esPrincipal: true },
          data:  { esPrincipal: false },
        });
      }
      const dir = await tx.direccion.create({
        data: {
          compradorId,
          alias:        data.alias,
          destinatario: data.destinatario,
          calle:        data.calle,
          zona:         data.zona ?? null,
          ciudad:       data.ciudad ?? "Santa Cruz",
          departamento: data.departamento ?? "Santa Cruz",
          referencia:   data.referencia ?? null,
          esPrincipal,
        },
      });
      return mapDireccion(dir);
    });
  },

  async update(
    id: string,
    data: {
      alias?: string;
      destinatario?: string;
      calle?: string;
      zona?: string | null;
      ciudad?: string;
      departamento?: string;
      referencia?: string | null;
    },
    prisma: PrismaClient,
  ) {
    const dir = await prisma.direccion.update({
      where: { id },
      data: {
        ...(data.alias        !== undefined && { alias: data.alias }),
        ...(data.destinatario !== undefined && { destinatario: data.destinatario }),
        ...(data.calle        !== undefined && { calle: data.calle }),
        ...(data.zona         !== undefined && { zona: data.zona }),
        ...(data.ciudad       !== undefined && { ciudad: data.ciudad }),
        ...(data.departamento !== undefined && { departamento: data.departamento }),
        ...(data.referencia   !== undefined && { referencia: data.referencia }),
      },
    });
    return mapDireccion(dir);
  },

  async softDelete(id: string, prisma: PrismaClient) {
    await prisma.direccion.update({ where: { id }, data: { activo: false } });
    return true;
  },

  async setPrincipal(id: string, compradorId: string, prisma: PrismaClient) {
    return prisma.$transaction(async (tx) => {
      await tx.direccion.updateMany({
        where: { compradorId, esPrincipal: true },
        data:  { esPrincipal: false },
      });
      const dir = await tx.direccion.update({
        where: { id },
        data:  { esPrincipal: true },
      });
      return mapDireccion(dir);
    });
  },
};
