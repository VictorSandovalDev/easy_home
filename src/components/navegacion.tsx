"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  Gavel,
  LayoutDashboard,
  Megaphone,
  Settings,
  ShieldCheck,
  Users,
  Vote,
  Luggage,
} from "lucide-react";

const ICONOS = {
  inicio: LayoutDashboard,
  comunicados: Megaphone,
  votaciones: Vote,
  reglamento: ClipboardList,
  sanciones: Gavel,
  reservas: Luggage,
  porteria: ShieldCheck,
  unidades: Building2,
  personas: Users,
  configuracion: Settings,
};

export type ItemNav = { href: string; texto: string; icono: keyof typeof ICONOS; grupo?: string };

export function Navegacion({ base, items }: { base: string; items: ItemNav[] }) {
  const ruta = usePathname();
  let grupoActual: string | undefined;

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
      {items.map((i) => {
        const href = base + i.href;
        const activo = i.href === "" ? ruta === base : ruta.startsWith(href);
        const Icono = ICONOS[i.icono];
        const encabezado = i.grupo && i.grupo !== grupoActual ? i.grupo : null;
        grupoActual = i.grupo ?? grupoActual;
        return (
          <div key={href} className="contents">
            {encabezado && (
              <p className="mt-5 mb-1 hidden px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:block">
                {encabezado}
              </p>
            )}
            <Link
              href={href}
              className={`group relative flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${
                activo ? "bg-marca/10 text-marca" : "text-slate-600 hover:bg-slate-100 hover:text-texto"
              }`}
            >
              {activo && <span className="absolute inset-y-2 left-0 hidden w-1 rounded-r-full bg-marca lg:block" />}
              <Icono className={`h-[18px] w-[18px] ${activo ? "text-marca" : "text-slate-400 group-hover:text-slate-600"}`} />
              {i.texto}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
