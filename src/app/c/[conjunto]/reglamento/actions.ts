"use server";

import { revalidatePath } from "next/cache";
import { exigir } from "@/lib/contexto";
import { separarArticulos, type EstadoAccion } from "@/lib/tipos";

export async function guardarArticulo(slug: string, _: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const { supabase, conjunto, ruta } = await exigir(slug, "administracion");
  const { error } = await supabase.from("rph_articulos").upsert(
    {
      conjunto_id: conjunto.id,
      capitulo: String(datos.get("capitulo") ?? "").trim() || null,
      numero: String(datos.get("numero")).trim(),
      titulo: String(datos.get("titulo")).trim(),
      texto: String(datos.get("texto")).trim(),
      sancionable: datos.get("sancionable") === "on",
    },
    { onConflict: "conjunto_id,numero" },
  );
  if (error) return { error: error.message };
  revalidatePath(ruta("/reglamento"));
  return { ok: "Artículo guardado." };
}

export async function importarReglamento(slug: string, _: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const { supabase, conjunto, ruta } = await exigir(slug, "administracion");
  const articulos = separarArticulos(String(datos.get("texto") ?? ""));
  if (!articulos.length) return { error: 'No encontramos artículos. Cada uno debe empezar con "ARTÍCULO N".' };

  const unicos = [...new Map(articulos.map((a) => [a.numero, a])).values()];
  const { error } = await supabase
    .from("rph_articulos")
    .upsert(unicos.map((a) => ({ ...a, conjunto_id: conjunto.id })), { onConflict: "conjunto_id,numero" });
  if (error) return { error: error.message };
  revalidatePath(ruta("/reglamento"));
  return { ok: `Se importaron ${unicos.length} artículos. Marca cuáles son sancionables.` };
}

export async function alternarSancionable(slug: string, id: string, valor: boolean) {
  const { supabase, ruta } = await exigir(slug, "administracion");
  await supabase.from("rph_articulos").update({ sancionable: valor }).eq("id", id);
  revalidatePath(ruta("/reglamento"));
}
