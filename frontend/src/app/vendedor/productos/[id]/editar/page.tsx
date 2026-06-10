"use client";

import { useMutation, useQuery } from "@apollo/client";
import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import Link from "next/link";
import { ACTUALIZAR_PRODUCTO } from "@/graphql/productos/mutations";
import { PRODUCTO, CATEGORIAS } from "@/graphql/productos/queries";
import { ArrowLeft, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApolloError } from "@apollo/client";
import type { ProductoCardData } from "@/components/productos/ProductoCard";
import { Select, type SelectOption } from "@/components/ui/Select";

const schema = z.object({
  nombre:      z.string().min(3, "Mínimo 3 caracteres"),
  descripcion: z.string().optional(),
  precio:      z.string().regex(/^\d+(\.\d{1,4})?$/, "Precio inválido"),
  stock:       z.number().int().min(0),
  categoriaId: z.string().min(1, "Selecciona una categoría"),
  etiquetas:   z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditarProductoPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const { data: prodData, loading } = useQuery<{ producto: ProductoCardData | null }>(PRODUCTO, { variables: { id } });
  const { data: catData } = useQuery<{
    categorias: { id: string; nombre: string; hijos: { id: string; nombre: string }[] }[]
  }>(CATEGORIAS, { variables: { soloRaices: false } });

  const [actualizarProducto] = useMutation(ACTUALIZAR_PRODUCTO);
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const producto = prodData?.producto;
  const categoriaOptions: SelectOption[] = (catData?.categorias ?? []).flatMap((c) => [
    { value: c.id, label: c.nombre, depth: 0 },
    ...c.hijos.map((h) => ({ value: h.id, label: h.nombre, depth: 1 })),
  ]);

  useEffect(() => {
    if (producto) {
      reset({
        nombre:      producto.nombre,
        descripcion: producto.descripcion ?? "",
        precio:      producto.precio,
        stock:       producto.stock,
        categoriaId: producto.categoria.id,
        etiquetas:   producto.etiquetas.map((e) => e.nombre).join(", "),
      });
    }
  }, [producto, reset]);

  async function onSubmit(values: FormData) {
    try {
      const etiquetas = values.etiquetas?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
      await actualizarProducto({
        variables: {
          id,
          input: {
            nombre:      values.nombre,
            descripcion: values.descripcion,
            precio:      values.precio,
            stock:       values.stock,
            categoriaId: values.categoriaId,
            etiquetas:   etiquetas.length > 0 ? etiquetas : [],
          },
        },
      });
      toast.success("Producto actualizado.");
      router.push("/vendedor/productos");
    } catch (err: unknown) {
      const msg = err instanceof ApolloError
        ? (err.graphQLErrors[0]?.message ?? "Error al actualizar.")
        : "Error al actualizar.";
      toast.error(msg);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        <p className="text-xs text-slate-400">Cargando producto…</p>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Producto no encontrado.</p>
        <Link href="/vendedor/productos" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">
          ← Volver
        </Link>
      </div>
    );
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
          <h1 className="text-xl font-bold text-slate-900">Editar producto</h1>
          <p className="text-sm text-slate-400 truncate">{producto.nombre}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Nombre *</label>
          <input {...register("nombre")}
                 className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                            focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all" />
          {errors.nombre && <p className="text-red-500 text-xs">{errors.nombre.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Descripción</label>
          <textarea {...register("descripcion")} rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                               focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Precio (Bs.) *</label>
            <input {...register("precio")} type="text"
                   className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                              focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all" />
            {errors.precio && <p className="text-red-500 text-xs">{errors.precio.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Stock *</label>
            <input {...register("stock", { valueAsNumber: true })} type="number" min={0}
                   className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                              focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all" />
          </div>
        </div>

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
                placeholder="Seleccionar…"
              />
            )}
          />
          {errors.categoriaId && <p className="text-red-500 text-xs">{errors.categoriaId.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Etiquetas <span className="text-slate-400 normal-case font-normal">(separadas por coma)</span>
          </label>
          <input {...register("etiquetas")}
                 className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                            focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all"
                 placeholder="nuevo, popular…" />
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
            {isSubmitting ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
