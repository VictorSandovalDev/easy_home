import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Conjunto, Rol } from "@/lib/tipos";

export const usuarioActual = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar");
  return user;
});

/** Conjunto, roles del usuario y unidades que tiene asignadas. Deduplicado por request. */
export const contextoConjunto = cache(async (slug: string) => {
  const supabase = await createClient();
  const user = await usuarioActual();

  const { data: conjunto } = await supabase.from("conjuntos").select("*").eq("slug", slug).maybeSingle<Conjunto>();
  if (!conjunto) notFound();

  const [{ data: membresias }, { data: plataforma }, { data: relaciones }] = await Promise.all([
    supabase.from("membresias").select("rol").eq("conjunto_id", conjunto.id).eq("usuario_id", user.id).eq("activo", true),
    supabase.from("plataforma_admins").select("usuario_id").eq("usuario_id", user.id).maybeSingle(),
    supabase
      .from("unidad_personas")
      .select("relacion, unidad:unidades!inner(id, torre, numero, conjunto_id, permite_renta_corta, coeficiente)")
      .eq("usuario_id", user.id)
      .eq("unidad.conjunto_id", conjunto.id),
  ]);

  const roles = new Set<Rol>((membresias ?? []).map((m) => m.rol as Rol));
  const esPlataforma = !!plataforma;
  const tiene = (...r: Rol[]) => esPlataforma || r.some((x) => roles.has(x));

  type Rel = {
    relacion: "propietario" | "administrador_propiedad" | "arrendatario";
    unidad: { id: string; torre: string | null; numero: string; permite_renta_corta: boolean; coeficiente: number };
  };
  const misUnidades = (relaciones ?? []) as unknown as Rel[];

  return {
    supabase,
    user,
    conjunto,
    roles,
    esPlataforma,
    tiene,
    esGestor: tiene("administracion", "consejo"),
    esAdministracion: tiene("administracion"),
    misUnidades,
    ruta: (p = "") => `/c/${conjunto.slug}${p}`,
  };
});

export async function exigir(slug: string, ...roles: Rol[]) {
  const ctx = await contextoConjunto(slug);
  if (!ctx.tiene(...roles)) redirect(ctx.ruta());
  return ctx;
}
