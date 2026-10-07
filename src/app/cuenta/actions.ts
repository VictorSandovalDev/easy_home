"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EstadoAccion } from "@/lib/tipos";

export async function guardarPerfil(_: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const { error } = await supabase
    .from("perfiles")
    .update({
      nombre: String(datos.get("nombre") ?? "").trim(),
      telefono: String(datos.get("telefono") ?? "").trim() || null,
      tipo_documento: String(datos.get("tipo_documento") ?? "") || null,
      numero_documento: String(datos.get("numero_documento") ?? "").trim() || null,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };

  const clave = String(datos.get("clave") ?? "");
  if (clave) {
    if (clave.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
    const { error: e } = await supabase.auth.updateUser({ password: clave });
    if (e) return { error: e.message };
  }
  revalidatePath("/", "layout");
  return { ok: "Datos guardados." };
}
