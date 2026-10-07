import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Perfil = { id: string; nombre: string; email: string | null; telefono: string | null };

export async function perfilesPorId(supabase: SupabaseClient, ids: string[]) {
  const unicos = [...new Set(ids)];
  if (!unicos.length) return new Map<string, Perfil>();
  const { data } = await supabase.from("perfiles").select("id, nombre, email, telefono").in("id", unicos);
  return new Map((data ?? []).map((p) => [p.id, p as Perfil]));
}

export const nombrePerfil = (p?: Perfil) => p?.nombre || p?.email || "Sin nombre";
