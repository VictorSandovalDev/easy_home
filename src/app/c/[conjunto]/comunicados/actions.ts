"use server";

import { redirect } from "next/navigation";
import { contextoConjunto } from "@/lib/contexto";
import { ROLES, type EstadoAccion, type Rol } from "@/lib/tipos";

export async function publicarComunicado(slug: string, _: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const { supabase, conjunto, user, tiene, ruta } = await contextoConjunto(slug);
  const emisor = String(datos.get("emisor")) as "administracion" | "consejo";
  if (!tiene(emisor)) return { error: "No puedes publicar en nombre de ese órgano." };

  const audiencia = datos.getAll("audiencia").map(String).filter((r): r is Rol => ROLES.includes(r as Rol));
  const { data, error } = await supabase
    .from("comunicados")
    .insert({
      conjunto_id: conjunto.id,
      autor_id: user.id,
      emisor,
      titulo: String(datos.get("titulo")).trim(),
      cuerpo: String(datos.get("cuerpo")).trim(),
      audiencia,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  redirect(ruta(`/comunicados/${data.id}`));
}
