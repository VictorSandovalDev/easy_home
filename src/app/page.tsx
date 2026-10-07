import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, LayoutGrid, UserRound } from "lucide-react";
import { BotonLink, Vacio } from "@/components/ui";
import { usuarioActual } from "@/lib/contexto";
import { createClient } from "@/lib/supabase/server";

export default async function Inicio() {
  const user = await usuarioActual();
  const supabase = await createClient();
  const [{ data: conjuntos }, { data: plataforma }] = await Promise.all([
    supabase.from("conjuntos").select("slug, nombre, ciudad, direccion, logo_url, color_primario").eq("activo", true).order("nombre"),
    supabase.from("plataforma_admins").select("usuario_id").eq("usuario_id", user.id).maybeSingle(),
  ]);

  if (!plataforma && conjuntos?.length === 1) redirect(`/c/${conjuntos[0].slug}`);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-marca">Easy Home</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Mis conjuntos</h1>
          <p className="mt-1 text-sm text-tenue">Selecciona el conjunto al que quieres ingresar.</p>
        </div>
        <div className="flex gap-2">
          {plataforma && <BotonLink href="/plataforma"><LayoutGrid className="h-4 w-4" /> Plataforma</BotonLink>}
          <BotonLink href="/cuenta" variante="secundario"><UserRound className="h-4 w-4" /> Mi cuenta</BotonLink>
        </div>
      </div>
      {!conjuntos?.length ? (
        <Vacio icono={Building2}>Aún no perteneces a ningún conjunto. Pide a la administración que te invite.</Vacio>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conjuntos.map((c) => (
            <Link
              key={c.slug}
              href={`/c/${c.slug}`}
              className="group overflow-hidden rounded-2xl border border-borde bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/70"
            >
              <div className="h-20" style={{ background: `linear-gradient(135deg, ${c.color_primario}, ${c.color_primario}aa)` }} />
              <div className="-mt-7 px-5 pb-5">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-white text-xl font-bold text-white shadow" style={{ background: c.color_primario }}>
                  {c.nombre[0]}
                </span>
                <p className="mt-3 font-semibold">{c.nombre}</p>
                <p className="text-sm text-tenue">{[c.direccion, c.ciudad].filter(Boolean).join(" · ")}</p>
                <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-marca">
                  Ingresar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
