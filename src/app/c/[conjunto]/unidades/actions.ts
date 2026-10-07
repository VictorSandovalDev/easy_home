"use server";

import { revalidatePath } from "next/cache";
import { exigir } from "@/lib/contexto";
import { asegurarUsuario } from "@/lib/invitar";
import type { EstadoAccion, Relacion } from "@/lib/tipos";

const numero = (v: FormDataEntryValue | null) => Number(String(v ?? "0").replace(",", ".")) || 0;

export async function crearUnidades(slug: string, _: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const { supabase, conjunto, ruta } = await exigir(slug, "administracion");
  // Formato por línea: torre;numero;coeficiente;cuota  (torre puede ir vacía)
  const filas = String(datos.get("lineas") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [torre, num, coef, cuota] = l.split(/[;\t]/).map((x) => x?.trim());
      return {
        conjunto_id: conjunto.id,
        torre: torre || null,
        numero: num,
        coeficiente: numero(coef ?? null),
        cuota_administracion: numero(cuota ?? null),
        tipo: String(datos.get("tipo") ?? "apartamento"),
      };
    })
    .filter((f) => f.numero);
  if (!filas.length) return { error: "Escribe al menos una unidad con el formato torre;número;coeficiente;cuota." };
  const { error } = await supabase.from("unidades").upsert(filas, { onConflict: "conjunto_id,torre,numero" });
  if (error) return { error: error.message };
  revalidatePath(ruta("/unidades"));
  return { ok: `${filas.length} unidad(es) guardadas.` };
}

export async function actualizarUnidad(slug: string, id: string, _: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const { supabase, ruta } = await exigir(slug, "administracion");
  const { error } = await supabase
    .from("unidades")
    .update({
      coeficiente: numero(datos.get("coeficiente")),
      cuota_administracion: numero(datos.get("cuota_administracion")),
      permite_renta_corta: datos.get("permite_renta_corta") === "on",
      tipo: String(datos.get("tipo")),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(ruta(`/unidades/${id}`));
  return { ok: "Unidad actualizada." };
}

export async function asignarPersona(slug: string, unidadId: string, _: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const { supabase, conjunto, ruta } = await exigir(slug, "administracion");
  const relacion = String(datos.get("relacion")) as Relacion;
  try {
    const usuarioId = await asegurarUsuario(String(datos.get("email")), String(datos.get("nombre") ?? ""));
    const { error } = await supabase.from("unidad_personas").upsert(
      { unidad_id: unidadId, usuario_id: usuarioId, relacion, hasta: String(datos.get("hasta") || "") || null },
      { onConflict: "unidad_id,usuario_id,relacion" },
    );
    if (error) return { error: error.message };
    // La relación con la unidad otorga el rol equivalente en el conjunto.
    await supabase
      .from("membresias")
      .upsert({ conjunto_id: conjunto.id, usuario_id: usuarioId, rol: relacion, activo: true }, { onConflict: "conjunto_id,usuario_id,rol" });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(ruta(`/unidades/${unidadId}`));
  return { ok: "Persona asignada. Si no tenía cuenta, recibirá una invitación por correo." };
}

export async function retirarPersona(slug: string, unidadId: string, vinculoId: string) {
  const { supabase, ruta } = await exigir(slug, "administracion");
  await supabase.from("unidad_personas").delete().eq("id", vinculoId);
  revalidatePath(ruta(`/unidades/${unidadId}`));
}
