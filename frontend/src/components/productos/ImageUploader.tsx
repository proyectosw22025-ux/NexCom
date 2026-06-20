"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useMutation } from "@apollo/client";
import { ImagePlus, Loader2, X, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { FIRMAR_SUBIDA_IMAGEN } from "@/graphql/productos/mutations";

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

const MAX_MB = 5;

export function ImageUploader({ value, onChange, max = 6 }: ImageUploaderProps) {
  const [firmar] = useMutation(FIRMAR_SUBIDA_IMAGEN);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function subirArchivo(file: File): Promise<string | null> {
    // 1. Pedir firma al backend (el secret nunca llega al navegador)
    const { data } = await firmar();
    const f = data.firmarSubidaImagen;
    // 2. Subir directo a Cloudinary con la firma
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", f.apiKey);
    form.append("timestamp", String(f.timestamp));
    form.append("folder", f.folder);
    form.append("signature", f.signature);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${f.cloudName}/image/upload`, {
      method: "POST", body: form,
    });
    if (!res.ok) throw new Error("Cloudinary rechazó la subida");
    const json = await res.json();
    return json.secure_url as string;
  }

  async function manejarArchivos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const restantes = max - value.length;
    if (restantes <= 0) { toast.error(`Máximo ${max} imágenes.`); return; }

    const seleccion = Array.from(files).slice(0, restantes);
    setSubiendo(true);
    try {
      const urls: string[] = [];
      for (const file of seleccion) {
        if (!file.type.startsWith("image/")) { toast.error(`"${file.name}" no es una imagen.`); continue; }
        if (file.size > MAX_MB * 1024 * 1024) { toast.error(`"${file.name}" supera ${MAX_MB}MB.`); continue; }
        const url = await subirArchivo(file);
        if (url) urls.push(url);
      }
      if (urls.length) onChange([...value, ...urls]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir la imagen.");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function quitar(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="space-y-3">
      {/* Zona de subida */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); manejarArchivos(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
          arrastrando ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
        }`}
      >
        {subiendo ? (
          <><Loader2 className="h-6 w-6 text-indigo-500 animate-spin" /><p className="text-xs text-slate-500">Subiendo…</p></>
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-slate-400" />
            <p className="text-xs text-slate-500 text-center">
              Arrastra imágenes o <span className="text-indigo-600 font-semibold">haz clic para elegir</span>
            </p>
            <p className="text-[11px] text-slate-400">PNG/JPG · máx {MAX_MB}MB · hasta {max} imágenes</p>
          </>
        )}
        <input
          ref={inputRef} type="file" accept="image/*" multiple hidden
          onChange={(e) => manejarArchivos(e.target.files)}
        />
      </div>

      {/* Miniaturas */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group">
              <Image src={url} alt={`Imagen ${i + 1}`} fill className="object-cover" />
              <button
                type="button"
                onClick={() => quitar(url)}
                aria-label="Quitar imagen"
                className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-red-600 text-white rounded-md p-0.5 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {i === 0 && (
                <span className="absolute bottom-0 inset-x-0 bg-indigo-600/90 text-white text-[9px] text-center py-0.5">
                  Principal
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {value.length === 0 && (
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <ImagePlus className="h-3.5 w-3.5" /> La primera imagen será la principal del producto.
        </p>
      )}
    </div>
  );
}
