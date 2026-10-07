import Link from "next/link";
import { Navegacion } from "@/components/navegacion";
import { contextoConjunto } from "@/lib/contexto";
import { NOMBRE_ROL } from "@/lib/tipos";

export async function generateMetadata({ params }: { params: Promise<{ conjunto: string }> }) {
  const { conjunto } = await contextoConjunto((await params).conjunto);
  return { title: { default: conjunto.nombre, template: `%s · ${conjunto.nombre}` } };
}

export default async function LayoutConjunto({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ conjunto: string }>;
}) {
  const ctx = await contextoConjunto((await params).conjunto);
  const { conjunto, tiene } = ctx;
  const tieneUnidadRenta = ctx.misUnidades.some(
    (u) => u.relacion !== "arrendatario" && u.unidad.permite_renta_corta,
  );

  const items = [
    { href: "", texto: "Inicio" },
    { href: "/comunicados", texto: "Comunicados" },
    { href: "/votaciones", texto: "Votaciones" },
    { href: "/reglamento", texto: "Reglamento (RPH)" },
    { href: "/sanciones", texto: ctx.esGestor ? "Sanciones" : "Mis notificaciones" },
    ...(conjunto.permite_renta_corta && (tieneUnidadRenta || tiene("administracion", "consejo"))
      ? [{ href: "/reservas", texto: "Huéspedes" }]
      : []),
    ...(tiene("porteria", "administracion") ? [{ href: "/porteria", texto: "Portería" }] : []),
    ...(ctx.esGestor ? [{ href: "/unidades", texto: "Unidades" }] : []),
    ...(ctx.esAdministracion ? [{ href: "/personas", texto: "Personas" }, { href: "/configuracion", texto: "Configuración" }] : []),
  ];

  const roles = [...ctx.roles].map((r) => NOMBRE_ROL[r]).join(" · ") || (ctx.esPlataforma ? "Plataforma" : "");

  return (
    <div style={{ "--marca": conjunto.color_primario } as React.CSSProperties} className="min-h-dvh md:flex">
      <aside className="border-b border-borde bg-superficie p-4 md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center gap-3">
          {conjunto.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={conjunto.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-marca font-bold text-white">
              {conjunto.nombre[0]}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{conjunto.nombre}</p>
            <p className="truncate text-xs text-tenue">{roles}</p>
          </div>
        </div>
        <Navegacion base={ctx.ruta()} items={items} />
        <div className="mt-4 flex gap-3 border-t border-borde pt-4 text-sm text-tenue md:absolute md:bottom-4 md:left-4 md:right-4">
          <Link href="/cuenta" className="hover:text-texto">Mi cuenta</Link>
          <Link href="/" className="hover:text-texto">Cambiar conjunto</Link>
          <form action="/auth/salir" method="post" className="ml-auto">
            <button className="hover:text-texto">Salir</button>
          </form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
