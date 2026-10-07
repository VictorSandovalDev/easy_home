"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { contextoConjunto } from "@/lib/contexto";
import type { EstadoAccion } from "@/lib/tipos";

function leerHuespedes(datos: FormData) {
  const col = (k: string) => datos.getAll(k).map((v) => String(v).trim());
  const nombres = col("h_nombre");
  const menores = new Set(col("h_menor").map(Number));
  return nombres
    .map((nombre, i) => ({
      nombre,
      tipo_documento: col("h_tipo_documento")[i],
      numero_documento: col("h_numero_documento")[i],
      nacionalidad: col("h_nacionalidad")[i] || "Colombia",
      telefono: col("h_telefono")[i] || null,
      placa_vehiculo: col("h_placa")[i]?.toUpperCase() || null,
      es_menor: menores.has(i),
      autoriza_datos: true,
    }))
    .filter((h) => h.nombre && h.numero_documento);
}

export async function crearReserva(slug: string, _: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const { supabase, conjunto, user, ruta } = await contextoConjunto(slug);
  if (datos.get("autoriza") !== "on") return { error: "Debes confirmar la autorización de tratamiento de datos de los huéspedes." };
  const huespedes = leerHuespedes(datos);
  if (!huespedes.length) return { error: "Registra al menos un huésped." };

  const { data: reserva, error } = await supabase
    .from("reservas")
    .insert({
      conjunto_id: conjunto.id,
      unidad_id: String(datos.get("unidad_id")),
      registrada_por: user.id,
      plataforma: String(datos.get("plataforma")),
      codigo_reserva: String(datos.get("codigo_reserva") ?? "").trim() || null,
      check_in: String(datos.get("check_in")),
      check_out: String(datos.get("check_out")),
      notas: String(datos.get("notas") ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message.includes("check") ? "La salida debe ser posterior a la llegada." : error.message };

  const { error: e2 } = await supabase.from("huespedes").insert(huespedes.map((h) => ({ ...h, reserva_id: reserva.id })));
  if (e2) return { error: e2.message };
  redirect(ruta(`/reservas/${reserva.id}`));
}

export async function agregarHuespedes(slug: string, reservaId: string, _: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const { supabase, ruta } = await contextoConjunto(slug);
  const huespedes = leerHuespedes(datos);
  if (!huespedes.length) return { error: "Registra al menos un huésped." };
  const { error } = await supabase.from("huespedes").insert(huespedes.map((h) => ({ ...h, reserva_id: reservaId })));
  if (error) return { error: error.message };
  revalidatePath(ruta(`/reservas/${reservaId}`));
  return { ok: "Huéspedes agregados." };
}

export async function quitarHuesped(slug: string, reservaId: string, huespedId: string) {
  const { supabase, ruta } = await contextoConjunto(slug);
  await supabase.from("huespedes").delete().eq("id", huespedId);
  revalidatePath(ruta(`/reservas/${reservaId}`));
}

export async function cambiarEstadoReserva(slug: string, reservaId: string, estado: "cancelada" | "finalizada") {
  const { supabase, ruta } = await contextoConjunto(slug);
  await supabase.from("reservas").update({ estado }).eq("id", reservaId);
  revalidatePath(ruta(`/reservas/${reservaId}`));
}
