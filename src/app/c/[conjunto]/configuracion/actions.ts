"use server";

import { revalidatePath } from "next/cache";
import { exigir } from "@/lib/contexto";
import type { EstadoAccion } from "@/lib/tipos";

export async function guardarConfiguracion(slug: string, _: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const { supabase, conjunto, ruta } = await exigir(slug, "administracion");
  const texto = (k: string) => String(datos.get(k) ?? "").trim() || null;
  const { error } = await supabase
    .from("conjuntos")
    .update({
      nombre: texto("nombre") ?? conjunto.nombre,
      nit: texto("nit"),
      direccion: texto("direccion"),
      ciudad: texto("ciudad"),
      logo_url: texto("logo_url"),
      color_primario: String(datos.get("color_primario")),
      dominio_personalizado: texto("dominio_personalizado")?.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "") ?? null,
      permite_renta_corta: datos.get("permite_renta_corta") === "on",
      dias_descargos: Number(datos.get("dias_descargos") || 5),
    })
    .eq("id", conjunto.id);
  if (error) return { error: error.code === "23505" ? "Ese dominio ya está asignado a otro conjunto." : error.message };
  revalidatePath(ruta(), "layout");
  return { ok: "Configuración guardada." };
}
