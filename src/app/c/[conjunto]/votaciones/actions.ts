"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { contextoConjunto } from "@/lib/contexto";
import type { EstadoAccion } from "@/lib/tipos";

// datetime-local llega sin zona; se interpreta en hora de Colombia (UTC-5).
const horaColombia = (v: FormDataEntryValue | null) => new Date(`${v}:00-05:00`).toISOString();

export async function crearVotacion(slug: string, _: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const { supabase, conjunto, user, tiene, ruta } = await contextoConjunto(slug);
  const emisor = String(datos.get("emisor")) as "administracion" | "consejo";
  if (!tiene(emisor)) return { error: "No autorizado." };

  const opciones = String(datos.get("opciones") ?? "")
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);
  if (opciones.length < 2) return { error: "Escribe al menos dos opciones, una por línea." };

  const { data: v, error } = await supabase
    .from("votaciones")
    .insert({
      conjunto_id: conjunto.id,
      creador_id: user.id,
      emisor,
      titulo: String(datos.get("titulo")).trim(),
      descripcion: String(datos.get("descripcion") ?? "").trim(),
      ponderada: datos.get("ponderada") === "on",
      abre_en: horaColombia(datos.get("abre_en")),
      cierra_en: horaColombia(datos.get("cierra_en")),
    })
    .select("id")
    .single();
  if (error) return { error: error.message.includes("check") ? "El cierre debe ser posterior a la apertura." : error.message };

  const { error: e2 } = await supabase
    .from("votacion_opciones")
    .insert(opciones.map((texto, orden) => ({ votacion_id: v.id, texto, orden })));
  if (e2) return { error: e2.message };
  redirect(ruta(`/votaciones/${v.id}`));
}

export async function votar(slug: string, votacionId: string, _: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const { supabase, user, ruta } = await contextoConjunto(slug);
  const { error } = await supabase.from("votos").upsert(
    {
      votacion_id: votacionId,
      unidad_id: String(datos.get("unidad_id")),
      opcion_id: String(datos.get("opcion_id")),
      usuario_id: user.id,
    },
    { onConflict: "votacion_id,unidad_id" },
  );
  if (error) return { error: error.message };
  revalidatePath(ruta(`/votaciones/${votacionId}`));
  return { ok: "Voto registrado. Puedes cambiarlo mientras la votación siga abierta." };
}
