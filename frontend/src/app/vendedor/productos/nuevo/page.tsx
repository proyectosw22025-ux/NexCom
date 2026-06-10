"use client";

import { useMutation, useQuery } from "@apollo/client";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { CREAR_PRODUCTO } from "@/graphql/productos/mutations";
import { CATEGORIAS } from "@/graphql/productos/queries";
import { ArrowLeft, Package, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { ApolloError } from "@apollo/client";
import { Select, type SelectOption } from "@/components/ui/Select";

const schema = z.object({
  nombre:      z.string().min(3, "Mínimo 3 caracteres"),
  descripcion: z.string().optional(),
  precio:      z.string().regex(/^\d+(\.\d{1,4})?$/, "Precio inválido (ej: 25.50)"),
  stock:       z.number().int().min(0, "Stock no puede ser negativo"),
  categoriaId: z.string().min(1, "Selecciona una categoría"),
  etiquetas:   z.string().optional(),
  imagenesUrl: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NuevoProductoPage() {
  const router = useRouter();
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const [crearProducto] = useMutation(CREAR_PRODUCTO);
  const { data: catData } = useQuery<{
    categorias: { id: string; nombre: string; hijos: { id: string; nombre: string }[] }[]
  }>(CATEGORIAS, { variables: { soloRaices: false } });

  const categoriaOptions: SelectOption[] = (catData?.categorias ?? []).flatMap((c) => [
    { value: c.id, label: c.nombre, depth: 0 },
    ...c.hijos.map((h) => ({ value: h.id, label: h.nombre, depth: 1 })),
  ]);

  async function onSubmit(values: FormData) {
    try {
      const etiquetas   = values.etiquetas?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
      const imagenesUrl = values.imagenesUrl?.split("\n").map((s) => s.trim()).filter(Boolean) ?? [];

      await crearProducto({
        variables: {
          input: {
            nombre:      values.nombre,
            descripcion: values.descripcion,
            precio:      values.precio,
            stock:       values.stock,
            categoriaId: values.categoriaId,
            etiquetas:   etiquetas.length > 0 ? etiquetas : undefined,
            imagenesUrl: imagenesUrl.length > 0 ? imagenesUrl : undefined,
          },
        },
      });
      toast.success("Producto creado exitosamente.");
      router.push("/vendedor/productos");
    } catch (err: unknown) {
      const msg = err instanceof ApolloError
        ? (err.graphQLErrors[0]?.message ?? "Error al crear el producto.")
        : "Error al crear el producto.";
      toast.error(msg);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/vendedor/productos" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Volver a productos
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <Package className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Nuevo producto</h1>
          <p className="text-sm text-slate-400">Completa los datos del producto</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        {/* Nombre */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Nombre *</label>
          <input {...register("nombre")}
                 className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                            focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all"
                 placeholder="Ej: Smartphone Samsung Galaxy A15" />
          {errors.nombre && <p className="text-red-500 text-xs">{errors.nombre.message}</p>}
        </div>

        {/* Descripción */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Descripción</label>
          <textarea {...register("descripcion")} rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                               focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all resize-none"
                    placeholder="Describe tu producto…" />
        </div>

        {/* Precio y stock */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Precio (Bs.) *</label>
            <input {...register("precio")} type="text"
                   className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                              focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all"
                   placeholder="25.00" />
            {errors.precio && <p className="text-red-500 text-xs">{errors.precio.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Stock *</label>
            <input {...register("stock", { valueAsNumber: true })} type="number" min={0}
                   className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                              focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all"
                   placeholder="10" />
            {errors.stock && <p className="text-red-500 text-xs">{errors.stock.message}</p>}
          </div>
        </div>

        {/* Categoría */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Categoría *</label>
          <Controller
            name="categoriaId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                options={categoriaOptions}
                placeholder="Seleccionar categoría…"
              />
            )}
          />
          {errors.categoriaId && <p className="text-red-500 text-xs">{errors.categoriaId.message}</p>}
        </div>

        {/* Etiquetas */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Etiquetas <span className="text-slate-400 normal-case font-normal">(separadas por coma)</span>
          </label>
          <input {...register("etiquetas")}
                 className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                            focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all"
                 placeholder="nuevo, popular, importado" />
        </div>

        {/* Imágenes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            <ImagePlus className="h-3.5 w-3.5 inline mr-1.5" />
            URLs de imágenes <span className="text-slate-400 normal-case font-normal">(una por línea, máx 5)</span>
          </label>
          <textarea {...register("imagenesUrl")} rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono
                               focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all resize-none"
                    placeholder="https://example.com/imagen1.jpg&#10;https://example.com/imagen2.jpg" />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/vendedor/productos"
                className="flex-1 flex items-center justify-center border border-slate-200 text-slate-700 font-semibold
                           rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700
                             disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm
                             transition-colors shadow-sm shadow-indigo-200">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Creando…" : "Crear producto"}
          </button>
        </div>
      </form>
    </div>
  );
}
