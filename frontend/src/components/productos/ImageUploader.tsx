"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useMutation } from "@apollo/client";
import { ImagePlus, Loader2, X, UploadCloud, FileCheck2, Lock } from "lucide-react";
import { toast } from "sonner";
import { FIRMAR_SUBIDA_IMAGEN, FIRMAR_SUBIDA_KYC } from "@/graphql/productos/mutations";

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  /** Modo privado (KYC): sube como `authenticated` y guarda el public_id, no la URL. */
  privado?: boolean;
}

const MAX_MB = 5;

export function ImageUploader({ value, onChange, max = 6, privado = false }: ImageUploaderProps) {
  const [firmarImg] = useMutation(FIRMAR_SUBIDA_IMAGEN);
  const [firmarKyc] = useMutation(FIRMAR_SUBIDA_KYC);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function subirArchivo(file: File): Promise<string | null> {
    // 1. Pedir firma al backend (el secret nunca llega al navegador)
    const f = privado
      ? (await firmarKyc()).data.firmarSubidaKyc
      : (await firmarImg()).data.firmarSubidaImagen;
    // 2. Subir directo a Cloudinary con la firma
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", f.apiKey);
    form.append("timestamp", String(f.timestamp));
    form.append("folder", f.folder);
    form.append("signature", f.signature);
    if (f.tipo) form.append("type", f.tipo); // authenticated (privado)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${f.cloudName}/image/upload`, {
      method: "POST", body: form,
    });
    if (!res.ok) throw new Error("Cloudinary rechazó la subida");
    const json = await res.json();
    // Privado: guardamos el public_id (el asset no es accesible por URL directa);
    // público: guardamos la URL de entrega.
    return (privado ? json.public_id : json.secure_url) as string;
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

      {/* Adjuntos */}
      {value.length > 0 && privado && (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => (
            <div key={id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50">
              <FileCheck2 className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-800">Documento adjuntado</span>
              <button type="button" onClick={() => quitar(id)} aria-label="Quitar documento"
                className="p-0.5 rounded hover:bg-emerald-200 transition-colors">
                <X className="h-3.5 w-3.5 text-emerald-700" />
              </button>
            </div>
          ))}
        </div>
      )}
      {value.length > 0 && !privado && (
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
      {value.length === 0 && !privado && (
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <ImagePlus className="h-3.5 w-3.5" /> La primera imagen será la principal del producto.
        </p>
      )}
      {privado && (
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" /> Tu documento se guarda de forma privada; solo lo ve el equipo de verificación.
        </p>
      )}
    </div>
  );
}
