"use server";

import { revalidatePath } from "next/cache";
import { exigir } from "@/lib/contexto";

export async function registrarAcceso(slug: string, huespedId: string, reservaId: string, tipo: "ingreso" | "salida") {
  const { supabase, user, ruta } = await exigir(slug, "porteria", "administracion");
  const { error } = await supabase.from("accesos").insert({ huesped_id: huespedId, tipo, registrado_por: user.id });
  if (error) throw new Error("No se pudo registrar el acceso: la reserva no está vigente.");
  if (tipo === "ingreso") {
    await supabase.from("reservas").update({ estado: "en_curso" }).eq("id", reservaId).eq("estado", "programada");
  }
  revalidatePath(ruta("/porteria"));
}
