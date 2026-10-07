"use server";

import { revalidatePath } from "next/cache";
import { exigir } from "@/lib/contexto";
import { asegurarUsuario } from "@/lib/invitar";
import type { EstadoAccion } from "@/lib/tipos";

export async function invitarMiembro(slug: string, _: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const { supabase, conjunto, ruta } = await exigir(slug, "administracion");
  const rol = String(datos.get("rol"));
  if (!["administracion", "consejo", "porteria"].includes(rol)) return { error: "Rol inválido." };
  try {
    const usuarioId = await asegurarUsuario(String(datos.get("email")), String(datos.get("nombre") ?? ""));
    const { error } = await supabase
      .from("membresias")
      .upsert({ conjunto_id: conjunto.id, usuario_id: usuarioId, rol, activo: true }, { onConflict: "conjunto_id,usuario_id,rol" });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(ruta("/personas"));
  return { ok: "Invitación enviada." };
}

export async function quitarMembresia(slug: string, id: string) {
  const { supabase, user, ruta } = await exigir(slug, "administracion");
  await supabase.from("membresias").delete().eq("id", id).neq("usuario_id", user.id);
  revalidatePath(ruta("/personas"));
}
