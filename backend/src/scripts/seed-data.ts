import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Sembrando datos de prueba…");

  // ── Categorías raíz ──────────────────────────────────────────────────────────
  const categorias = [
    { nombre: "Electrónica",     slug: "electronica",     icono: "💻", orden: 1 },
    { nombre: "Ropa y Moda",     slug: "ropa-moda",       icono: "👗", orden: 2 },
    { nombre: "Alimentos",       slug: "alimentos",       icono: "🍎", orden: 3 },
    { nombre: "Hogar",           slug: "hogar",           icono: "🏠", orden: 4 },
    { nombre: "Salud y Belleza", slug: "salud-belleza",   icono: "💄", orden: 5 },
  ];

  const catMap: Record<string, string> = {};
  for (const cat of categorias) {
    const c = await prisma.categoria.upsert({
      where:  { slug: cat.slug },
      update: { nombre: cat.nombre, icono: cat.icono, orden: cat.orden },
      create: cat,
    });
    catMap[cat.slug] = c.id;
    console.log(`  ✓ Categoría: ${cat.nombre}`);
  }

  // ── Subcategorías ─────────────────────────────────────────────────────────────
  const subcategorias = [
    { nombre: "Smartphones",    slug: "smartphones",    padreId: catMap["electronica"],   orden: 1 },
    { nombre: "Laptops",        slug: "laptops",        padreId: catMap["electronica"],   orden: 2 },
    { nombre: "Camisas",        slug: "camisas",        padreId: catMap["ropa-moda"],     orden: 1 },
    { nombre: "Pantalones",     slug: "pantalones",     padreId: catMap["ropa-moda"],     orden: 2 },
    { nombre: "Frutas",         slug: "frutas",         padreId: catMap["alimentos"],     orden: 1 },
    { nombre: "Snacks",         slug: "snacks",         padreId: catMap["alimentos"],     orden: 2 },
  ];

  for (const sub of subcategorias) {
    const c = await prisma.categoria.upsert({
      where:  { slug: sub.slug },
      update: { nombre: sub.nombre, padreId: sub.padreId, orden: sub.orden },
      create: sub,
    });
    catMap[sub.slug] = c.id;
    console.log(`    ↳ Subcategoría: ${sub.nombre}`);
  }

  // ── Configuración del sistema ─────────────────────────────────────────────────
  const configs = [
    { clave: "max_productos_vendedor", valor: "50",  tipo: "NUMBER",  descripcion: "Límite de productos activos por vendedor" },
    { clave: "max_imagenes_producto",  valor: "5",   tipo: "NUMBER",  descripcion: "Máximo de imágenes por producto" },
    { clave: "comision_plataforma",    valor: "5",   tipo: "NUMBER",  descripcion: "Comisión de NexCom (%)" },
  ];

  for (const cfg of configs) {
    await prisma.configuracionSistema.upsert({
      where:  { clave: cfg.clave },
      update: { valor: cfg.valor },
      create: cfg,
    });
  }
  console.log("  ✓ Configuración del sistema");

  // ── Etiquetas de prueba ───────────────────────────────────────────────────────
  const etiquetaNombres = ["oferta", "nuevo", "popular", "importado", "local", "orgánico"];
  for (const nombre of etiquetaNombres) {
    const slug = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    await prisma.etiqueta.upsert({
      where:  { slug },
      update: {},
      create: { nombre, slug },
    });
  }
  console.log("  ✓ Etiquetas");

  // ── Vendedor de prueba ────────────────────────────────────────────────────────
  let vendedorPerfil = await prisma.perfilVendedor.findFirst({
    where: { usuario: { email: "vendedor@nexcom.bo" } },
  });

  if (!vendedorPerfil) {
    const hash = await bcrypt.hash("Vendedor123!", 12);
    const u = await prisma.usuario.upsert({
      where:  { email: "vendedor@nexcom.bo" },
      update: { verificado: true, activo: true },
      create: {
        email: "vendedor@nexcom.bo", passwordHash: hash,
        rol: "VENDEDOR", verificado: true, activo: true,
        perfilVendedor: {
          create: {
            nombreNegocio: "Tienda Demo NexCom",
            descripcion:   "Tienda de demostración con productos variados.",
            ciudad:        "Santa Cruz",
          },
        },
      },
      include: { perfilVendedor: true },
    });
    vendedorPerfil = u.perfilVendedor!;
    console.log("  ✓ Vendedor de prueba: vendedor@nexcom.bo / Vendedor123!");
  } else {
    console.log("  ✓ Vendedor de prueba (ya existe)");
  }

  // ── Comprador de prueba ────────────────────────────────────────────────────────
  const existeComprador = await prisma.usuario.findUnique({ where: { email: "comprador@nexcom.bo" } });
  if (!existeComprador) {
    const hash = await bcrypt.hash("Comprador123!", 12);
    await prisma.usuario.create({
      data: {
        email: "comprador@nexcom.bo", passwordHash: hash,
        rol: "COMPRADOR", verificado: true, activo: true,
        perfilComprador: {
          create: { nombreCompleto: "Juan Comprador", telefono: "+591 70000001" },
        },
      },
    });
    console.log("  ✓ Comprador de prueba: comprador@nexcom.bo / Comprador123!");
  } else {
    console.log("  ✓ Comprador de prueba (ya existe)");
  }

  // ── Productos de prueba ───────────────────────────────────────────────────────
  const productosSeed = [
    {
      nombre: "Smartphone Samsung Galaxy A15",
      descripcion: "Pantalla 6.5 pulgadas, 4GB RAM, 128GB almacenamiento. Ideal para uso diario.",
      precio: "699.00",
      stock: 15,
      categoriaSlug: "smartphones",
      etiquetas: ["popular", "importado"],
    },
    {
      nombre: "Laptop Lenovo IdeaPad 15",
      descripcion: "Intel Core i5, 8GB RAM, 512GB SSD, Windows 11. Perfecta para trabajo y estudio.",
      precio: "4500.00",
      stock: 8,
      categoriaSlug: "laptops",
      etiquetas: ["nuevo", "importado"],
    },
    {
      nombre: "Camisa Oxford Slim Fit",
      descripcion: "Tela 100% algodón, disponible en azul y blanco. Tallas S, M, L, XL.",
      precio: "120.00",
      stock: 50,
      categoriaSlug: "camisas",
      etiquetas: ["local", "nuevo"],
    },
    {
      nombre: "Manzanas Red Delicious (kg)",
      descripcion: "Manzanas importadas de Chile, frescas y jugosas. Precio por kilogramo.",
      precio: "18.50",
      stock: 200,
      categoriaSlug: "frutas",
      etiquetas: ["orgánico"],
    },
    {
      nombre: "Chips de Plátano",
      descripcion: "Snack artesanal boliviano elaborado con plátanos verdes, sal y aceite de girasol.",
      precio: "12.00",
      stock: 100,
      categoriaSlug: "snacks",
      etiquetas: ["local", "oferta"],
    },
  ];

  for (const prod of productosSeed) {
    const categoria = await prisma.categoria.findUnique({ where: { slug: prod.categoriaSlug } });
    if (!categoria) continue;

    const existe = await prisma.producto.findFirst({
      where: { nombre: prod.nombre, vendedorId: vendedorPerfil!.id },
    });
    if (existe) {
      console.log(`  ~ Producto (ya existe): ${prod.nombre}`);
      continue;
    }

    const etiquetaIds: string[] = [];
    for (const nombreEtiq of prod.etiquetas) {
      const slug = nombreEtiq.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      const e = await prisma.etiqueta.findUnique({ where: { slug } });
      if (e) etiquetaIds.push(e.id);
    }

    await prisma.producto.create({
      data: {
        nombre:      prod.nombre,
        descripcion: prod.descripcion,
        precio:      prod.precio,
        stock:       prod.stock,
        vendedorId:  vendedorPerfil!.id,
        categoriaId: categoria.id,
        activo:      true,
        etiquetas: { create: etiquetaIds.map((etiquetaId) => ({ etiquetaId })) },
      },
    });
    console.log(`  ✓ Producto: ${prod.nombre}`);
  }

  console.log("\n✅ Seed completado exitosamente.");
  console.log("\n📋 Credenciales de prueba:");
  console.log("   Admin:     admin@nexcom.bo        / Admin1234!");
  console.log("   Vendedor:  vendedor@nexcom.bo      / Vendedor123!");
  console.log("   Comprador: comprador@nexcom.bo     / Comprador123!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
