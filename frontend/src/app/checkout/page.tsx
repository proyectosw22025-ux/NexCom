"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/cart-context";
import { MIS_DIRECCIONES } from "@/graphql/direcciones/queries";
import { CREAR_DIRECCION } from "@/graphql/direcciones/mutations";
import { VALIDAR_CUPON } from "@/graphql/cupones/mutations";
import { CREAR_ORDEN_SIMULADA } from "@/graphql/pagos/mutations";
import { MIS_PUNTOS } from "@/graphql/fidelidad";
import { ApolloError } from "@apollo/client";
import {
  MapPin, Plus, Tag, ShoppingBag, ChevronRight, Loader2, CheckCircle, X,
  QrCode, Landmark, Truck, Store, Gift,
} from "lucide-react";
import { toast } from "sonner";
import { Decimal } from "decimal.js";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";
import { AvisoMultiVendedor } from "@/components/cart/AvisoMultiVendedor";

interface Direccion {
  id: string;
  alias: string;
  destinatario: string;
  calle: string;
  zona: string | null;
  ciudad: string;
  departamento: string;
  referencia: string | null;
  esPrincipal: boolean;
}

interface CuponValidado {
  cuponId: string;
  codigo: string;
  descuento: string;
  totalConDescuento: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { carrito } = useCart();
  const [direccionId, setDireccionId]       = useState<string | null>(null);
  const [codigoCupon, setCodigoCupon]       = useState("");
  const [cuponAplicado, setCuponAplicado]   = useState<CuponValidado | null>(null);
  const [validandoCupon, setValidandoCupon] = useState(false);
  const [creandoPago, setCreandoPago]       = useState(false);
  const [metodoPago, setMetodoPago]         = useState<"qr" | "transferencia" | "contra_entrega">("qr");
  const [metodoEntrega, setMetodoEntrega]   = useState<"domicilio" | "retiro_tienda">("domicilio");
  const [usarPuntos, setUsarPuntos]         = useState(false);
  const [mostrarFormDir, setMostrarFormDir] = useState(false);
  const [nuevaDir, setNuevaDir] = useState({
    alias: "", destinatario: "", calle: "", zona: "", ciudad: "Santa Cruz",
    departamento: "Santa Cruz", referencia: "", esPrincipal: false,
  });

  const { data: dirData, refetch: refetchDirs } = useQuery<{ misDirecciones: Direccion[] }>(
    MIS_DIRECCIONES, { fetchPolicy: "cache-and-network" },
  );
  const { data: puntosData } = useQuery<{ misPuntos: { disponibles: number; valorBs: string } }>(
    MIS_PUNTOS, { fetchPolicy: "cache-and-network" },
  );
  const [validarCupon]       = useMutation(VALIDAR_CUPON);
  const [crearDireccion]     = useMutation(CREAR_DIRECCION);
  const [crearOrdenSimulada] = useMutation(CREAR_ORDEN_SIMULADA);

  const direcciones = dirData?.misDirecciones ?? [];

  const items    = carrito?.items ?? [];
  const subtotal = items.reduce(
    (acc, it) => acc.plus(new Decimal(it.precioSnapshot).mul(it.cantidad)),
    new Decimal(0),
  );
  const descuento     = cuponAplicado ? new Decimal(cuponAplicado.descuento) : new Decimal(0);

  // Envío: por vendedor distinto, según departamento de la dirección elegida
  const EJE_CENTRAL = ["Santa Cruz", "La Paz", "Cochabamba"];
  const departamentoSel = direcciones.find((d) => d.id === direccionId)?.departamento ?? "";
  const numVendedores = new Set(
    items.map((it) => it.producto.vendedor?.id ?? it.producto.vendedor?.nombreNegocio ?? "?"),
  ).size;
  const costoPorVendedor = metodoEntrega === "retiro_tienda"
    ? 0 : (EJE_CENTRAL.includes(departamentoSel) ? 15 : 25);
  const envio = new Decimal(costoPorVendedor * Math.max(numVendedores, 1));

  // Puntos de fidelidad: solo en compras de una sola tienda (como los cupones)
  const puntosDisponibles = puntosData?.misPuntos.disponibles ?? 0;
  const puntosCanjeables = numVendedores === 1 && puntosDisponibles > 0;
  const baseDescontable = subtotal.minus(descuento);
  const descuentoPuntos = usarPuntos && puntosCanjeables
    ? Decimal.min(new Decimal(puntosDisponibles).mul("0.10"), baseDescontable)
    : new Decimal(0);

  const total = baseDescontable.minus(descuentoPuntos).plus(envio);

  async function handleValidarCupon() {
    if (!codigoCupon.trim()) return;
    setValidandoCupon(true);
    try {
      const { data } = await validarCupon({
        variables: { codigo: codigoCupon.trim(), subtotal: subtotal.toString() },
      });
      setCuponAplicado(data.validarCupon);
      toast.success(`Cupón aplicado: −Bs. ${data.validarCupon.descuento}`);
    } catch (err: unknown) {
      const msg = err instanceof ApolloError
        ? (err.graphQLErrors[0]?.message ?? "Cupón inválido.")
        : "Cupón inválido.";
      toast.error(msg);
    } finally {
      setValidandoCupon(false);
    }
  }

  async function handleCrearDireccion() {
    try {
      const { data } = await crearDireccion({
        variables: {
          input: {
            alias:        nuevaDir.alias,
            destinatario: nuevaDir.destinatario,
            calle:        nuevaDir.calle,
            zona:         nuevaDir.zona || null,
            ciudad:       nuevaDir.ciudad,
            departamento: nuevaDir.departamento,
            referencia:   nuevaDir.referencia || null,
            esPrincipal:  nuevaDir.esPrincipal,
          },
        },
      });
      await refetchDirs();
      setDireccionId(data.crearDireccion.id);
      setMostrarFormDir(false);
      setNuevaDir({ alias: "", destinatario: "", calle: "", zona: "", ciudad: "Santa Cruz", departamento: "Santa Cruz", referencia: "", esPrincipal: false });
      toast.success("Dirección guardada.");
    } catch (err: unknown) {
      const msg = err instanceof ApolloError
        ? (err.graphQLErrors[0]?.message ?? "Error al guardar dirección.")
        : "Error al guardar dirección.";
      toast.error(msg);
    }
  }

  async function handleRealizarPedido() {
    if (!direccionId) { toast.error("Selecciona una dirección de envío."); return; }
    if (items.length === 0) { toast.error("Tu carrito está vacío."); return; }
    setCreandoPago(true);
    try {
      const { data } = await crearOrdenSimulada({
        variables: { direccionId, cuponCodigo: cuponAplicado?.codigo ?? null, metodoPago, metodoEntrega, usarPuntos: usarPuntos && puntosCanjeables },
      });
      const { ordenIds } = data.crearOrdenSimulada;

      // Contra entrega: las órdenes ya quedan confirmadas → directo a confirmación
      if (metodoPago === "contra_entrega") {
        router.push(`/checkout/confirmacion?ordenId=${ordenIds[0]}&count=${ordenIds.length}&status=ok`);
        return;
      }
      // QR / transferencia: ir a la pantalla de pago para confirmar
      sessionStorage.setItem("nexcom_checkout", JSON.stringify({ ordenIds, metodoPago, total: total.toFixed(2) }));
      router.push("/checkout/pago");
    } catch (err: unknown) {
      const msg = err instanceof ApolloError
        ? (err.graphQLErrors[0]?.message ?? "Error al crear el pedido.")
        : "Error al crear el pedido.";
      toast.error(msg);
    } finally {
      setCreandoPago(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">Tu carrito está vacío</h1>
        <Link href="/productos" className="text-indigo-600 hover:underline text-sm">
          ← Ir al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Finalizar compra</h1>

      <div className="max-w-md mx-auto sm:mx-0 sm:max-w-sm">
        <CheckoutStepper current="carrito" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Columna principal */}
        <div className="lg:col-span-3 space-y-6">

          <AvisoMultiVendedor items={items} />

          {/* Dirección de envío */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Dirección de envío</h2>
            </div>

            {direcciones.length > 0 && (
              <div className="space-y-2 mb-4">
                {direcciones.map((d) => (
                  <label key={d.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    direccionId === d.id ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="direccion"
                      value={d.id}
                      checked={direccionId === d.id}
                      onChange={() => setDireccionId(d.id)}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{d.alias}
                        {d.esPrincipal && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Principal</span>}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">{d.destinatario} — {d.calle}{d.zona ? `, ${d.zona}` : ""}</p>
                      <p className="text-xs text-slate-400">{d.ciudad}, {d.departamento}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {!mostrarFormDir ? (
              <button
                onClick={() => setMostrarFormDir(true)}
                className="flex items-center gap-2 text-sm text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" /> Agregar nueva dirección
              </button>
            ) : (
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Alias</label>
                    <input
                      value={nuevaDir.alias}
                      onChange={(e) => setNuevaDir((p) => ({ ...p, alias: e.target.value }))}
                      placeholder="Casa, Trabajo…"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Destinatario</label>
                    <input
                      value={nuevaDir.destinatario}
                      onChange={(e) => setNuevaDir((p) => ({ ...p, destinatario: e.target.value }))}
                      placeholder="Nombre completo"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Calle / Dirección</label>
                  <input
                    value={nuevaDir.calle}
                    onChange={(e) => setNuevaDir((p) => ({ ...p, calle: e.target.value }))}
                    placeholder="Av. Cañoto 123"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Zona</label>
                    <input
                      value={nuevaDir.zona}
                      onChange={(e) => setNuevaDir((p) => ({ ...p, zona: e.target.value }))}
                      placeholder="Equipetrol, El Trompillo…"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Referencia</label>
                    <input
                      value={nuevaDir.referencia}
                      onChange={(e) => setNuevaDir((p) => ({ ...p, referencia: e.target.value }))}
                      placeholder="Frente al mercado…"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCrearDireccion}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-indigo-200"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setMostrarFormDir(false)}
                    className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cupón */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Cupón de descuento</h2>
            </div>
            {cuponAplicado ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">{cuponAplicado.codigo}</p>
                    <p className="text-xs text-emerald-600">−Bs. {cuponAplicado.descuento}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setCuponAplicado(null); setCodigoCupon(""); }}
                  className="p-1 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <X className="h-4 w-4 text-emerald-600" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={codigoCupon}
                  onChange={(e) => setCodigoCupon(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 uppercase"
                />
                <button
                  onClick={handleValidarCupon}
                  disabled={validandoCupon || !codigoCupon.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-200 disabled:opacity-50"
                >
                  {validandoCupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                </button>
              </div>
            )}
          </div>

          {/* Método de entrega */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Método de entrega</h2>
            <div className="space-y-2">
              {([
                { v: "domicilio",     icon: Truck, t: "Envío a domicilio", d: "Recíbelo en tu dirección" },
                { v: "retiro_tienda", icon: Store, t: "Retiro en tienda",   d: "Recoge gratis donde el vendedor" },
              ] as const).map(({ v, icon: Icon, t, d }) => (
                <label key={v} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  metodoEntrega === v ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"
                }`}>
                  <input type="radio" name="metodoEntrega" value={v} checked={metodoEntrega === v}
                    onChange={() => setMetodoEntrega(v)} className="accent-indigo-600" />
                  <Icon className={`h-5 w-5 shrink-0 ${metodoEntrega === v ? "text-indigo-600" : "text-slate-400"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{t}</p>
                    <p className="text-xs text-slate-500">{d}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700 shrink-0">
                    {v === "retiro_tienda" ? "Gratis" : `Bs. ${costoPorVendedor}`}
                  </span>
                </label>
              ))}
            </div>
            {metodoEntrega === "domicilio" && numVendedores > 1 && (
              <p className="text-xs text-amber-600 mt-2">
                Tu compra es de {numVendedores} tiendas: se cobra envío por cada una.
              </p>
            )}
          </div>

          {/* Método de pago (Bolivia) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Método de pago</h2>
            <div className="space-y-2">
              {([
                { v: "qr",             icon: QrCode,   t: "QR Simple",        d: "Escanea y paga con la app de tu banco" },
                { v: "transferencia",  icon: Landmark, t: "Transferencia bancaria", d: "Transfiere y sube tu comprobante" },
                { v: "contra_entrega", icon: Truck,    t: "Pago contra entrega",    d: "Paga en efectivo al recibir tu pedido" },
              ] as const).map(({ v, icon: Icon, t, d }) => (
                <label key={v} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  metodoPago === v ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"
                }`}>
                  <input type="radio" name="metodoPago" value={v} checked={metodoPago === v}
                    onChange={() => setMetodoPago(v)} className="accent-indigo-600" />
                  <Icon className={`h-5 w-5 shrink-0 ${metodoPago === v ? "text-indigo-600" : "text-slate-400"}`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t}</p>
                    <p className="text-xs text-slate-500">{d}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Resumen de orden */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sticky top-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Resumen</h2>

            <div className="space-y-2 mb-4">
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 truncate flex-1 pr-2">
                    {it.producto.nombre} <span className="text-slate-400">×{it.cantidad}</span>
                  </span>
                  <span className="text-slate-900 font-medium shrink-0">
                    Bs. {new Decimal(it.precioSnapshot).mul(it.cantidad).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Puntos de fidelidad */}
            {puntosDisponibles > 0 && (
              <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox" checked={usarPuntos} disabled={!puntosCanjeables}
                    onChange={(e) => setUsarPuntos(e.target.checked)}
                    className="accent-amber-500 disabled:opacity-40"
                  />
                  <Gift className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-xs text-amber-800 flex-1">
                    Usar mis <strong>{puntosDisponibles} puntos</strong> (Bs. {puntosData?.misPuntos.valorBs})
                  </span>
                </label>
                {!puntosCanjeables && numVendedores > 1 && (
                  <p className="text-[11px] text-amber-600 mt-1">Canjeables solo en compras de una sola tienda.</p>
                )}
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-900">Bs. {subtotal.toFixed(2)}</span>
              </div>
              {descuento.gt(0) && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">Descuento</span>
                  <span className="text-emerald-600">−Bs. {descuento.toFixed(2)}</span>
                </div>
              )}
              {descuentoPuntos.gt(0) && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-600">Puntos canjeados</span>
                  <span className="text-amber-600">−Bs. {descuentoPuntos.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Envío{metodoEntrega === "domicilio" && numVendedores > 1 ? ` (${numVendedores} tiendas)` : ""}</span>
                <span className="text-slate-900">{envio.gt(0) ? `Bs. ${envio.toFixed(2)}` : "Gratis"}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-1 border-t border-slate-100">
                <span className="text-slate-900">Total</span>
                <span className="text-indigo-600">Bs. {total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleRealizarPedido}
              disabled={creandoPago || !direccionId}
              className="mt-5 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700
                         disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold
                         rounded-xl py-3 text-sm transition-colors shadow-sm shadow-indigo-200"
            >
              {creandoPago
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando…</>
                : <><ChevronRight className="h-4 w-4" /> {metodoPago === "contra_entrega" ? "Confirmar pedido" : "Realizar pedido"}</>
              }
            </button>

            <p className="text-xs text-slate-400 text-center mt-3">
              Pagos en Bs. · QR · Transferencia · Contra entrega
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
