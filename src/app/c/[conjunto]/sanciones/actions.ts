"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { contextoConjunto, exigir } from "@/lib/contexto";
import { hoyColombia, type EstadoAccion } from "@/lib/tipos";

export async function crearSancion(slug: string, _: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const { supabase, conjunto, user, ruta } = await exigir(slug, "administracion");
  const [unidadId, destinatarioId] = String(datos.get("destino") ?? "").split("|");
  const tipo = String(datos.get("tipo")) as "llamado_atencion" | "multa";
  const valor = tipo === "multa" ? Number(datos.get("valor") || 0) : 0;
  if (tipo === "multa" && valor <= 0) return { error: "Indica el valor de la multa." };

  const { data: unidad } = await supabase.from("unidades").select("cuota_administracion").eq("id", unidadId).single();
  const tope = Number(unidad?.cuota_administracion ?? 0) * 2;
  if (tipo === "multa" && tope > 0 && valor > tope) {
    return { error: `La multa supera el tope de dos expensas mensuales de la unidad (art. 59, Ley 675): máximo ${tope.toLocaleString("es-CO")}.` };
  }

  const plazo = hoyColombia(conjunto.dias_descargos);

  const { data, error } = await supabase
    .from("sanciones")
    .insert({
      conjunto_id: conjunto.id,
      unidad_id: unidadId,
      destinatario_id: destinatarioId,
      articulo_id: String(datos.get("articulo_id") || "") || null,
      tipo,
      valor,
      hechos: String(datos.get("hechos")).trim(),
      fecha_hechos: String(datos.get("fecha_hechos")),
      plazo_descargos: plazo,
      creada_por: user.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  redirect(ruta(`/sanciones/${data.id}`));
}

export async function presentarDescargos(slug: string, sancionId: string, _: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const { supabase, user, ruta } = await contextoConjunto(slug);
  const { error } = await supabase
    .from("sancion_eventos")
    .insert({ sancion_id: sancionId, autor_id: user.id, tipo: "descargo", texto: String(datos.get("texto")).trim() });
  if (error) return { error: error.message };
  revalidatePath(ruta(`/sanciones/${sancionId}`));
  return { ok: "Descargos enviados a la administración." };
}

export async function decidirSancion(slug: string, sancionId: string, _: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const { supabase, user, ruta } = await exigir(slug, "administracion");
  const estado = String(datos.get("estado")) as "confirmada" | "revocada" | "pagada";
  const texto = String(datos.get("texto") ?? "").trim();
  if (!texto) return { error: "Escribe la motivación de la decisión." };

  const { error } = await supabase.from("sanciones").update({ estado }).eq("id", sancionId);
  if (error) return { error: error.message };
  const etiqueta = { confirmada: "Sanción confirmada", revocada: "Sanción revocada", pagada: "Pago registrado" }[estado];
  await supabase.from("sancion_eventos").insert({ sancion_id: sancionId, autor_id: user.id, tipo: "decision", texto: `${etiqueta}. ${texto}` });
  revalidatePath(ruta(`/sanciones/${sancionId}`));
  return { ok: "Decisión registrada." };
}
