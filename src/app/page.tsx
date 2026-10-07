import Link from "next/link";
import { redirect } from "next/navigation";
import { BotonLink, Tarjeta, Vacio } from "@/components/ui";
import { usuarioActual } from "@/lib/contexto";
import { createClient } from "@/lib/supabase/server";

export default async function Inicio() {
  const user = await usuarioActual();
  const supabase = await createClient();
  const [{ data: conjuntos }, { data: plataforma }] = await Promise.all([
    supabase.from("conjuntos").select("slug, nombre, ciudad, logo_url, color_primario").eq("activo", true).order("nombre"),
    supabase.from("plataforma_admins").select("usuario_id").eq("usuario_id", user.id).maybeSingle(),
  ]);

  if (!plataforma && conjuntos?.length === 1) redirect(`/c/${conjuntos[0].slug}`);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mis conjuntos</h1>
        <div className="flex gap-2">
          {plataforma && <BotonLink href="/plataforma" variante="secundario">Plataforma</BotonLink>}
          <BotonLink href="/cuenta" variante="secundario">Mi cuenta</BotonLink>
        </div>
      </div>
      {!conjuntos?.length ? (
        <Vacio>Aún no perteneces a ningún conjunto. Pide a la administración que te invite.</Vacio>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {conjuntos.map((c) => (
            <Link key={c.slug} href={`/c/${c.slug}`}>
              <Tarjeta className="flex items-center gap-3 hover:border-marca">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg font-bold text-white" style={{ background: c.color_primario }}>
                  {c.nombre[0]}
                </span>
                <span>
                  <span className="block font-medium">{c.nombre}</span>
                  <span className="text-sm text-tenue">{c.ciudad}</span>
                </span>
              </Tarjeta>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
