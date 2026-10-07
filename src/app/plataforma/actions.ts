"use server";

import { revalidatePath } from "next/cache";
import { asegurarUsuario } from "@/lib/invitar";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { EstadoAccion } from "@/lib/tipos";

export async function crearConjunto(_: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const supabase = await createClient();
  const { data: esPlataforma } = await supabase.rpc("es_admin_plataforma");
  if (!esPlataforma) return { error: "No autorizado." };

  const slug = String(datos.get("slug") ?? "").trim().toLowerCase();
  const { data: conjunto, error } = await supabase
    .from("conjuntos")
    .insert({
      slug,
      nombre: String(datos.get("nombre")).trim(),
      nit: String(datos.get("nit") ?? "").trim() || null,
      ciudad: String(datos.get("ciudad") ?? "").trim() || null,
      color_primario: String(datos.get("color_primario") ?? "#0f766e"),
    })
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? "Ese identificador ya está en uso." : error.message };

  const email = String(datos.get("email_admin") ?? "").trim();
  if (email) {
    try {
      const usuarioId = await asegurarUsuario(email, String(datos.get("nombre_admin") ?? ""));
      // La membresía inicial la crea el operador con service role (aún no hay administración).
      await createAdminClient().from("membresias").insert({ conjunto_id: conjunto.id, usuario_id: usuarioId, rol: "administracion" });
    } catch (e) {
      return { error: (e as Error).message };
    }
  }
  revalidatePath("/plataforma");
  return { ok: `Conjunto creado. Acceso: /c/${slug}` };
}
