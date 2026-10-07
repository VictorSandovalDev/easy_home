import Link from "next/link";
import { LogOut, Repeat, UserRound } from "lucide-react";
import { Navegacion, type ItemNav } from "@/components/navegacion";
import { Avatar } from "@/components/ui";
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
  const { conjunto, tiene, supabase, user } = ctx;
  const tieneUnidadRenta = ctx.misUnidades.some((u) => u.relacion !== "arrendatario" && u.unidad.permite_renta_corta);
  const { data: perfil } = await supabase.from("perfiles").select("nombre").eq("id", user.id).maybeSingle();
  const nombre = perfil?.nombre || user.email || "";

  const items: ItemNav[] = [
    { href: "", texto: "Inicio", icono: "inicio" },
    { href: "/comunicados", texto: "Comunicados", icono: "comunicados", grupo: "Comunidad" },
    { href: "/votaciones", texto: "Votaciones", icono: "votaciones", grupo: "Comunidad" },
    { href: "/reglamento", texto: "Reglamento", icono: "reglamento", grupo: "Comunidad" },
    { href: "/sanciones", texto: ctx.esGestor ? "Sanciones" : "Notificaciones", icono: "sanciones", grupo: "Convivencia" },
    ...(conjunto.permite_renta_corta && (tieneUnidadRenta || tiene("administracion", "consejo"))
      ? [{ href: "/reservas", texto: "Huéspedes", icono: "reservas", grupo: "Convivencia" } as ItemNav]
      : []),
    ...(tiene("porteria", "administracion") ? [{ href: "/porteria", texto: "Portería", icono: "porteria", grupo: "Convivencia" } as ItemNav] : []),
    ...(ctx.esGestor ? [{ href: "/unidades", texto: "Unidades", icono: "unidades", grupo: "Gestión" } as ItemNav] : []),
    ...(ctx.esAdministracion
      ? ([
          { href: "/personas", texto: "Personas", icono: "personas", grupo: "Gestión" },
          { href: "/configuracion", texto: "Configuración", icono: "configuracion", grupo: "Gestión" },
        ] as ItemNav[])
      : []),
  ];

  const roles = [...ctx.roles].map((r) => NOMBRE_ROL[r]).join(" · ") || (ctx.esPlataforma ? "Operador de plataforma" : "");

  return (
    <div style={{ "--marca": conjunto.color_primario } as React.CSSProperties} className="min-h-dvh lg:flex">
      <aside className="sticky top-0 z-20 border-b border-borde bg-white/95 backdrop-blur lg:flex lg:h-dvh lg:w-72 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 lg:pb-6">
          {conjunto.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={conjunto.logo_url} alt="" className="h-10 w-10 rounded-xl object-contain" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-marca to-marca/70 text-base font-bold text-white shadow-md shadow-marca/30">
              {conjunto.nombre[0]}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-tight">{conjunto.nombre}</p>
            <p className="truncate text-xs text-tenue">{conjunto.ciudad ?? "Propiedad horizontal"}</p>
          </div>
        </div>

        <div className="px-4 pb-3 lg:flex-1 lg:overflow-y-auto lg:pb-4">
          <Navegacion base={ctx.ruta()} items={items} />
        </div>

        <div className="hidden border-t border-borde p-4 lg:block">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <Avatar nombre={nombre} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{nombre}</p>
              <p className="truncate text-xs text-tenue">{roles}</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1 text-xs font-medium text-slate-500">
            <Link href="/cuenta" className="flex flex-col items-center gap-1 rounded-lg py-2 hover:bg-slate-100 hover:text-texto">
              <UserRound className="h-4 w-4" /> Cuenta
            </Link>
            <Link href="/" className="flex flex-col items-center gap-1 rounded-lg py-2 hover:bg-slate-100 hover:text-texto">
              <Repeat className="h-4 w-4" /> Conjuntos
            </Link>
            <form action="/auth/salir" method="post">
              <button className="flex w-full flex-col items-center gap-1 rounded-lg py-2 hover:bg-red-50 hover:text-red-600">
                <LogOut className="h-4 w-4" /> Salir
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
        <div className="flex items-center justify-between border-t border-borde px-4 py-4 text-xs text-tenue lg:hidden">
          <span className="truncate">{nombre}</span>
          <div className="flex gap-4">
            <Link href="/cuenta">Cuenta</Link>
            <form action="/auth/salir" method="post"><button>Salir</button></form>
          </div>
        </div>
      </div>
    </div>
  );
}
