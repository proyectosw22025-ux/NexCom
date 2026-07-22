/**
 * Seed de ACTIVIDAD histórica (~75 días) para poblar los reportes/analítica del
 * admin con datos realistas: varios vendedores y compradores, productos por
 * categoría (con inventario sano/bajo/agotado), y órdenes backdated con estados,
 * métodos de pago y ciudades variadas + tendencia creciente (para deltas).
 *
 * Idempotente: las órdenes sembradas se marcan con notas="seed-demo" y se borran
 * antes de regenerarse, de modo que re-ejecutar no duplica.
 *
 *   npx tsx src/scripts/seed-actividad.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

const DIAS = 75;
const SENTINEL = "seed-demo";

const CIUDADES = ["Santa Cruz", "La Paz", "Cochabamba", "El Alto", "Sucre", "Tarija", "Oruro", "Potosí"];

// Imágenes Unsplash VERIFICADAS (mismas del frontend: lib/marketplace-images.ts)
const U = (id: string, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
const IMG_POR_CAT: Record<string, string> = {
  electronica: U("1498049794561-7780e7231661"), smartphones: U("1498049794561-7780e7231661"),
  laptops:     U("1498049794561-7780e7231661"),
  "ropa-moda": U("1445205170230-053b83016050"), camisas: U("1445205170230-053b83016050"),
  pantalones:  U("1445205170230-053b83016050"),
  alimentos:   U("1542838132-92c53300491e"),    frutas: U("1542838132-92c53300491e"),
  snacks:      U("1542838132-92c53300491e"),
  hogar:       U("1556228453-efd6c1ff04f6"),
  "salud-belleza": U("1596462502278-27bfdc403348"),
};
const IMG_GENERICA = U("1441986300917-64674bd600d8");

const COMENTARIOS = [
  "Excelente calidad, llegó rapidísimo. Recomendado.",
  "Todo tal como en las fotos, muy buen vendedor.",
  "Buen producto, la entrega tardó un poco pero llegó bien.",
  "Me encantó, volveré a comprar en esta tienda.",
  "Cumple con lo prometido. Buena atención por mensajes.",
  "Producto original y bien empacado. 100% confiable.",
  "Relación precio-calidad muy buena.",
];

const genCodigo = () => String(rint(100000, 999999));
const rnd  = (min: number, max: number) => Math.random() * (max - min) + min;
const rint = (min: number, max: number) => Math.floor(rnd(min, max + 1));
const pick = <T,>(arr: T[]): T => arr[rint(0, arr.length - 1)];
function pickW<T>(items: [T, number][]): T {
  const tot = items.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * tot;
  for (const [v, w] of items) { if ((r -= w) <= 0) return v; }
  return items[0][0];
}

// ── Catálogo de vendedores demo (negocio + ciudad + productos) ──────────────
const VENDEDORES = [
  {
    email: "tecnobolivia@demo.bo", negocio: "TecnoBolivia", ciudad: "Santa Cruz", rating: 4.7,
    productos: [
      { nombre: "Smartphone Xiaomi Redmi 13",  cat: "smartphones", precio: 1450, stock: 22 },
      { nombre: "Audífonos Bluetooth TWS",      cat: "smartphones", precio: 180,  stock: 60 },
      { nombre: "Laptop HP Pavilion 14",        cat: "laptops",     precio: 5200, stock: 6 },
      { nombre: "Mouse Gamer RGB",              cat: "laptops",     precio: 95,   stock: 0 },
      { nombre: "Cargador rápido 33W",          cat: "smartphones", precio: 75,   stock: 3 },
    ],
  },
  {
    email: "modaandina@demo.bo", negocio: "Moda Andina", ciudad: "La Paz", rating: 4.5,
    productos: [
      { nombre: "Camisa Oxford Slim",           cat: "camisas",     precio: 130, stock: 40 },
      { nombre: "Chompa de Alpaca",             cat: "camisas",     precio: 320, stock: 12 },
      { nombre: "Jean Clásico Azul",            cat: "pantalones",  precio: 210, stock: 25 },
      { nombre: "Pantalón Chino Beige",         cat: "pantalones",  precio: 185, stock: 2 },
    ],
  },
  {
    email: "saboresvalle@demo.bo", negocio: "Sabores del Valle", ciudad: "Cochabamba", rating: 4.8,
    productos: [
      { nombre: "Café de altura (500g)",        cat: "snacks",      precio: 65,  stock: 80 },
      { nombre: "Miel de abeja orgánica (1kg)", cat: "snacks",      precio: 90,  stock: 35 },
      { nombre: "Manzanas Red Delicious (kg)",  cat: "frutas",      precio: 18,  stock: 150 },
      { nombre: "Chips de Plátano",             cat: "snacks",      precio: 12,  stock: 0 },
      { nombre: "Quinua Real (1kg)",            cat: "frutas",      precio: 45,  stock: 4 },
    ],
  },
  {
    email: "casahogar@demo.bo", negocio: "Casa & Hogar", ciudad: "Santa Cruz", rating: 4.3,
    productos: [
      { nombre: "Juego de Sábanas Queen",       cat: "hogar",       precio: 240, stock: 18 },
      { nombre: "Set de Ollas Antiadherentes",  cat: "hogar",       precio: 520, stock: 9 },
      { nombre: "Lámpara LED de escritorio",    cat: "hogar",       precio: 140, stock: 30 },
      { nombre: "Organizador de cocina",        cat: "hogar",       precio: 85,  stock: 1 },
    ],
  },
  {
    email: "bellezanatural@demo.bo", negocio: "Belleza Natural", ciudad: "Sucre", rating: 4.6,
    productos: [
      { nombre: "Crema facial de karité",       cat: "salud-belleza", precio: 110, stock: 45 },
      { nombre: "Aceite de argán (100ml)",      cat: "salud-belleza", precio: 95,  stock: 20 },
      { nombre: "Kit de maquillaje básico",     cat: "salud-belleza", precio: 260, stock: 7 },
      { nombre: "Shampoo sólido natural",       cat: "salud-belleza", precio: 48,  stock: 0 },
    ],
  },
];

const COMPRADORES = [
  "María Fernández", "Carlos Quispe", "Ana Mamani", "Luis Rojas", "Sofía Vargas",
  "Diego Torres", "Valeria Flores", "Jorge Choque", "Camila Suárez", "Andrés Gutiérrez",
  "Lucía Paredes", "Pablo Mendoza", "Daniela Cruz", "Marco Vaca",
];

async function ensureCategoria(slug: string, nombre: string, padreId?: string) {
  return prisma.categoria.upsert({
    where: { slug }, update: {}, create: { slug, nombre, padreId, activo: true },
  });
}

async function main() {
  console.log(`🌱 Sembrando ~${DIAS} días de actividad…`);

  // ── Categorías (raíz + sub) que usan los productos ─────────────────────────
  const raices: Record<string, string> = {};
  for (const [slug, nombre] of [
    ["electronica", "Electrónica"], ["ropa-moda", "Ropa y Moda"], ["alimentos", "Alimentos"],
    ["hogar", "Hogar"], ["salud-belleza", "Salud y Belleza"],
  ] as const) raices[slug] = (await ensureCategoria(slug, nombre)).id;

  const subDe: Record<string, string> = {
    smartphones: "electronica", laptops: "electronica", camisas: "ropa-moda",
    pantalones: "ropa-moda", frutas: "alimentos", snacks: "alimentos",
  };
  const catId: Record<string, string> = { ...raices };
  for (const [slug, padreSlug] of Object.entries(subDe)) {
    const nombre = slug.charAt(0).toUpperCase() + slug.slice(1);
    catId[slug] = (await ensureCategoria(slug, nombre, raices[padreSlug])).id;
  }

  // ── Vendedores demo + sus productos ────────────────────────────────────────
  const hashV = await bcrypt.hash("Demo1234!", 10);
  const vendedores: { perfilId: string; ciudad: string; productos: { id: string; precio: number; nombre: string }[] }[] = [];

  for (const v of VENDEDORES) {
    const u = await prisma.usuario.upsert({
      where: { email: v.email }, update: { activo: true, verificado: true },
      create: {
        email: v.email, passwordHash: hashV, rol: "VENDEDOR", verificado: true, activo: true,
        perfilVendedor: { create: { nombreNegocio: v.negocio, ciudad: v.ciudad, verificado: true, ratingPromedio: new Prisma.Decimal(v.rating) } },
      },
      include: { perfilVendedor: true },
    });
    const perfilId = u.perfilVendedor!.id;

    const productos: { id: string; precio: number; nombre: string }[] = [];
    for (const p of v.productos) {
      let prod = await prisma.producto.findFirst({ where: { nombre: p.nombre, vendedorId: perfilId } });
      if (!prod) {
        prod = await prisma.producto.create({
          data: { nombre: p.nombre, descripcion: `${p.nombre} — producto de ${v.negocio}.`,
            precio: new Prisma.Decimal(p.precio), stock: p.stock, vendedorId: perfilId,
            categoriaId: catId[p.cat], activo: true, destacado: Math.random() < 0.25 },
        });
      } else {
        await prisma.producto.update({ where: { id: prod.id }, data: { stock: p.stock } });
      }
      productos.push({ id: prod.id, precio: p.precio, nombre: p.nombre });
    }
    vendedores.push({ perfilId, ciudad: v.ciudad, productos });
    console.log(`  ✓ Vendedor: ${v.negocio} (${v.productos.length} productos)`);
  }

  // ── Compradores demo ───────────────────────────────────────────────────────
  const hashC = await bcrypt.hash("Demo1234!", 10);
  const compradores: { perfilId: string; usuarioId: string; nombre: string; ciudad: string }[] = [];
  for (let i = 0; i < COMPRADORES.length; i++) {
    const nombre = COMPRADORES[i];
    const email = `cliente${i + 1}@demo.bo`;
    const u = await prisma.usuario.upsert({
      where: { email }, update: { activo: true, verificado: true },
      create: {
        email, passwordHash: hashC, rol: "CLIENTE", verificado: true, activo: true,
        perfilComprador: { create: { nombreCompleto: nombre, telefono: `+591 7${rint(1000000, 9999999)}` } },
      },
      include: { perfilComprador: true },
    });
    compradores.push({ perfilId: u.perfilComprador!.id, usuarioId: u.id, nombre, ciudad: pick(CIUDADES) });
  }
  console.log(`  ✓ ${compradores.length} compradores`);

  // ── Limpiar órdenes demo previas (idempotencia) ────────────────────────────
  const previas = await prisma.orden.findMany({ where: { notas: SENTINEL }, select: { id: true } });
  if (previas.length) {
    const ids = previas.map((o) => o.id);
    await prisma.movimientoSaldo.deleteMany({ where: { ordenId: { in: ids } } }); // ledger de las demo
    await prisma.pago.deleteMany({ where: { ordenId: { in: ids } } });
    await prisma.valoracion.deleteMany({ where: { ordenId: { in: ids } } });
    await prisma.usoCupon.deleteMany({ where: { ordenId: { in: ids } } });
    await prisma.orden.deleteMany({ where: { id: { in: ids } } }); // items/historial: cascade
    console.log(`  ↺ ${ids.length} órdenes demo previas eliminadas (con su ledger)`);
  }

  // Pesos: compradores recurrentes (algunos compran mucho más)
  const pesoComprador = compradores.map((c, i) => [c, i < 4 ? 5 : i < 8 ? 2 : 1] as [typeof c, number]);

  const ventasPorProducto: Record<string, number> = {};
  const ventasPorVendedor: Record<string, number> = {};
  const movimientos: Prisma.MovimientoSaldoCreateManyInput[] = [];
  const valoraciones: Prisma.ValoracionCreateManyInput[] = [];
  const usosCupon: { ordenId: string; usuarioId: string; descuento: number; creadoEn: Date }[] = [];
  let totalOrdenes = 0;
  const now = new Date();

  // ── Cupones (global + por tienda) — el global respalda los descuentos demo ──
  const mkCupon = (codigo: string, tipo: string, valor: number, vendedorId: string | null, maxUsos: number | null) =>
    prisma.cupon.upsert({
      where: { codigo }, update: { activo: true },
      create: {
        codigo, tipo, valor: new Prisma.Decimal(valor), vendedorId, maxUsos,
        montoMinimo: new Prisma.Decimal(50),
        fechaInicio: new Date(now.getTime() - DIAS * 86_400_000),
        fechaFin:    new Date(now.getTime() + 30 * 86_400_000),
        activo: true,
      },
    });
  const cuponGlobal = await mkCupon("BIENVENIDA10", "PORCENTAJE", 10, null, 200);
  await mkCupon("TECNO25",  "MONTO_FIJO", 25, vendedores[0].perfilId, 50);
  await mkCupon("SABOR15",  "PORCENTAJE", 15, vendedores[2].perfilId, 80);
  console.log("  ✓ Cupones: BIENVENIDA10 (global), TECNO25, SABOR15");

  for (let d = DIAS - 1; d >= 0; d--) {
    const dayIndex = DIAS - 1 - d;                 // 0 = más antiguo, DIAS-1 = hoy
    const trend = 1 + (dayIndex / DIAS) * 2.2;     // crecimiento suave hacia el presente
    const ordenesHoy = Math.max(0, Math.round(rnd(0.5, 2.2) * trend));

    for (let k = 0; k < ordenesHoy; k++) {
      const ven = pick(vendedores);
      const comp = pickW(pesoComprador);
      const fecha = new Date(now);
      fecha.setDate(now.getDate() - d);
      fecha.setHours(rint(8, 21), rint(0, 59), rint(0, 59), 0);

      // 1-3 productos del vendedor
      const nItems = rint(1, Math.min(3, ven.productos.length));
      const elegidos = [...ven.productos].sort(() => Math.random() - 0.5).slice(0, nItems);
      let subtotal = 0;
      const items = elegidos.map((p) => {
        const cantidad = rint(1, 3);
        const sub = p.precio * cantidad;
        subtotal += sub;
        ventasPorProducto[p.id] = (ventasPorProducto[p.id] ?? 0) + cantidad;
        return { productoId: p.id, nombreSnapshot: p.nombre, cantidad,
          precioUnitario: new Prisma.Decimal(p.precio), subtotal: new Prisma.Decimal(sub) };
      });

      const descuento = Math.random() < 0.25 ? Math.round(subtotal * rnd(0.05, 0.15)) : 0;
      const envio = pickW([[0, 3], [15, 2], [25, 1]]);
      const total = subtotal - descuento + envio;

      // Estados por antigüedad: las órdenes de hace >6 días solo quedan en
      // estados TERMINALES; si quedaran en PAGADO/EN_PREPARACION, el cron de
      // protección al cliente las cancelaría y reembolsaría de verdad.
      const esVieja = d > 6;
      const estado = esVieja
        ? pickW<"COMPLETADO" | "ENTREGADO" | "CANCELADO">([["COMPLETADO", 62], ["ENTREGADO", 24], ["CANCELADO", 14]])
        : pickW<"COMPLETADO" | "ENTREGADO" | "ENVIADO" | "EN_PREPARACION" | "PAGADO" | "CANCELADO">([
            ["COMPLETADO", 18], ["ENTREGADO", 24], ["ENVIADO", 22], ["EN_PREPARACION", 14], ["PAGADO", 14], ["CANCELADO", 8],
          ]);
      const metodo = pickW([["qr", 38], ["transferencia", 22], ["contra_entrega", 18], ["tarjeta", 22]]);
      const ciudad = Math.random() < 0.7 ? comp.ciudad : ven.ciudad;
      if (estado !== "CANCELADO") ventasPorVendedor[ven.perfilId] = (ventasPorVendedor[ven.perfilId] ?? 0) + 1;

      const entregada  = estado === "ENTREGADO" || estado === "COMPLETADO";
      const libFecha   = entregada ? new Date(fecha.getTime() + rint(1, 4) * 86_400_000) : null;

      const creada = await prisma.orden.create({
        data: {
          compradorId: comp.perfilId, vendedorId: ven.perfilId, estado,
          subtotal: new Prisma.Decimal(subtotal), descuentoCupon: new Prisma.Decimal(descuento),
          costoEnvio: new Prisma.Decimal(envio), total: new Prisma.Decimal(total),
          metodoEntrega: envio === 0 ? "retiro_tienda" : "domicilio",
          direccionSnapshot: { ciudad, nombreCompleto: comp.nombre, departamento: ciudad },
          notas: SENTINEL, creadoEn: fecha,
          // Coherencia con el escrow real: entregadas tienen fecha de liberación;
          // las ENVIADO llevan QR del paquete y ventana de auto-liberación.
          fondosLiberadosEn: libFecha,
          codigoEntrega: estado === "ENVIADO" || entregada ? genCodigo() : null,
          autoLiberaEn: estado === "ENVIADO" ? new Date(fecha.getTime() + 7 * 86_400_000) : null,
          items: { create: items },
          pago: { create: {
            monto: new Prisma.Decimal(total), moneda: "BOB", metodo,
            estado: estado === "CANCELADO" ? "FALLIDO" : "COMPLETADO", creadoEn: fecha,
          } },
        },
      });

      // Valoraciones (~45% de las completadas) y usos del cupón global
      if (estado === "COMPLETADO" && Math.random() < 0.45) {
        valoraciones.push({
          ordenId: creada.id, compradorId: comp.perfilId, vendedorId: ven.perfilId,
          calificacion: pickW([[5, 55], [4, 30], [3, 12], [2, 3]]),
          comentario: Math.random() < 0.8 ? pick(COMENTARIOS) : null,
          creadoEn: new Date(fecha.getTime() + rint(2, 6) * 86_400_000),
        });
      }
      if (descuento > 0 && estado !== "CANCELADO") {
        usosCupon.push({ ordenId: creada.id, usuarioId: comp.usuarioId, descuento, creadoEn: fecha });
      }

      // Ledger coherente con el escrow: toda venta pagada RETIENE (comisión 10%
      // plan FREE); las ya entregadas/completadas además LIBERAN el neto.
      if (estado !== "CANCELADO") {
        const comision = Math.round(total * 0.10 * 100) / 100;
        const neto     = Math.round((total - comision) * 100) / 100;
        movimientos.push({
          vendedorId: ven.perfilId, tipo: "RETENCION", monto: new Prisma.Decimal(neto),
          comision: new Prisma.Decimal(comision), ordenId: creada.id,
          descripcion: `Retención orden #${creada.id.slice(-6).toUpperCase()}`, creadoEn: fecha,
        });
        if (estado === "ENTREGADO" || estado === "COMPLETADO") {
          movimientos.push({
            vendedorId: ven.perfilId, tipo: "LIBERACION", monto: new Prisma.Decimal(neto),
            comision: new Prisma.Decimal(0), ordenId: creada.id,
            descripcion: `Liberación orden #${creada.id.slice(-6).toUpperCase()}`,
            creadoEn: new Date(fecha.getTime() + rint(1, 4) * 86_400_000),
          });
        }
      }
      totalOrdenes++;
    }
  }

  // ── Ledger de saldos (retenciones/liberaciones de las ventas demo) ─────────
  if (movimientos.length) {
    await prisma.movimientoSaldo.createMany({ data: movimientos });
    console.log(`  ✓ ${movimientos.length} movimientos de ledger (retención/liberación)`);
  }

  // ── Valoraciones + rating real por vendedor ────────────────────────────────
  if (valoraciones.length) {
    await prisma.valoracion.createMany({ data: valoraciones });
    const porVendedor = new Map<string, number[]>();
    for (const v of valoraciones) (porVendedor.get(v.vendedorId) ?? porVendedor.set(v.vendedorId, []).get(v.vendedorId)!).push(v.calificacion);
    for (const [vendedorId, califs] of porVendedor) {
      const avg = califs.reduce((a, b) => a + b, 0) / califs.length;
      await prisma.perfilVendedor.update({
        where: { id: vendedorId },
        data: { ratingPromedio: new Prisma.Decimal(avg.toFixed(2)), totalResenias: califs.length },
      });
    }
    console.log(`  ✓ ${valoraciones.length} valoraciones (rating real recalculado)`);
  }

  // ── Usos del cupón global (respaldan los descuentos de las órdenes) ────────
  if (usosCupon.length) {
    await prisma.usoCupon.createMany({
      data: usosCupon.map((u) => ({
        cuponId: cuponGlobal.id, ordenId: u.ordenId, usuarioId: u.usuarioId,
        descuento: new Prisma.Decimal(u.descuento), creadoEn: u.creadoEn,
      })),
    });
    await prisma.cupon.update({ where: { id: cuponGlobal.id }, data: { usosActuales: usosCupon.length } });
    console.log(`  ✓ ${usosCupon.length} usos del cupón BIENVENIDA10`);
  }

  // ── Fotos: todo producto sin imagen recibe una por su categoría ────────────
  const sinFoto = await prisma.producto.findMany({
    where: { imagenes: { none: {} } },
    select: { id: true, categoria: { select: { slug: true } } },
  });
  if (sinFoto.length) {
    await prisma.imagenProducto.createMany({
      data: sinFoto.map((p) => ({ productoId: p.id, url: IMG_POR_CAT[p.categoria.slug] ?? IMG_GENERICA, orden: 0 })),
    });
    console.log(`  ✓ ${sinFoto.length} productos recibieron foto`);
  }

  // ── Ofertas: 3 activas (visibles en la tienda) + 1 finalizada (historial) ──
  const mkOferta = async (vIdx: number, titulo: string, descuento: number, estado: "ACTIVA" | "VENCIDA", diasIni: number, diasFin: number, nProds: number) => {
    const ven = vendedores[vIdx];
    const ya = await prisma.oferta.findFirst({ where: { titulo, vendedorId: ven.perfilId } });
    if (ya) return;
    await prisma.oferta.create({
      data: {
        vendedorId: ven.perfilId, titulo, descripcion: `${titulo} — solo por tiempo limitado.`,
        descuento: new Prisma.Decimal(descuento), estado,
        fechaInicio: new Date(now.getTime() + diasIni * 86_400_000),
        fechaFin:    new Date(now.getTime() + diasFin * 86_400_000),
        productos: { create: ven.productos.slice(0, nProds).map((p) => ({ productoId: p.id })) },
      },
    });
  };
  await mkOferta(0, "Semana Tecno: hasta 20% off", 20, "ACTIVA",     -2, 8, 3);
  await mkOferta(1, "Moda de invierno -15%",       15, "ACTIVA",     -1, 6, 2);
  await mkOferta(2, "Feria del sabor -10%",        10, "ACTIVA",     -3, 5, 3);
  await mkOferta(3, "Liquidación de hogar -25%",   25, "VENCIDA", -20, -10, 2);
  console.log("  ✓ Ofertas: 3 activas + 1 vencida");

  // ── Actualizar contadores agregados ────────────────────────────────────────
  for (const [productoId, total] of Object.entries(ventasPorProducto)) {
    await prisma.producto.update({ where: { id: productoId }, data: { totalVendido: total } });
  }
  for (const [perfilId, total] of Object.entries(ventasPorVendedor)) {
    await prisma.perfilVendedor.update({ where: { id: perfilId }, data: { totalVentas: total } });
  }

  console.log(`\n✅ Seed de actividad completado: ${totalOrdenes} órdenes en ${DIAS} días.`);
  console.log(`   Vendedores demo: ${VENDEDORES.length} · Compradores: ${compradores.length}`);
  console.log(`   Acceso demo (todos): contraseña "Demo1234!"`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
