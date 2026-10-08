import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Tarjeta({ className, ...p }: ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-borde/80 bg-superficie p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_-8px_rgba(15,23,42,0.08)]",
        className,
      )}
      {...p}
    />
  );
}

export function TituloSeccion({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-semibold text-texto">{children}</h2>
      {accion}
    </div>
  );
}

export function Encabezado({ titulo, descripcion, accion }: { titulo: string; descripcion?: string; accion?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold tracking-tight text-texto">{titulo}</h1>
        {descripcion && <p className="mt-1.5 max-w-2xl text-sm text-tenue">{descripcion}</p>}
      </div>
      {accion}
    </div>
  );
}

export function Volver({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-tenue transition hover:text-marca">
      <span aria-hidden>←</span> {children}
    </Link>
  );
}

const estilosBoton = {
  primario:
    "bg-marca text-white shadow-sm shadow-marca/30 hover:brightness-110 active:brightness-95 focus-visible:ring-4 focus-visible:ring-marca/25",
  secundario: "border border-borde bg-superficie text-texto shadow-sm hover:border-slate-300 hover:bg-slate-50",
  peligro: "bg-red-600 text-white shadow-sm hover:bg-red-700",
  fantasma: "text-marca hover:bg-marca/10",
  // Para usar sobre fondos de color de marca (p. ej. el banner del tablero)
  claro: "bg-white text-marca shadow-sm hover:bg-blue-50",
  translucido: "bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25",
};
const baseBoton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold outline-none transition disabled:pointer-events-none disabled:opacity-50";

export function Boton({
  variante = "primario",
  className,
  ...p
}: ComponentProps<"button"> & { variante?: keyof typeof estilosBoton }) {
  return <button className={cx(baseBoton, estilosBoton[variante], className)} {...p} />;
}

export function BotonLink({
  variante = "primario",
  className,
  ...p
}: ComponentProps<typeof Link> & { variante?: keyof typeof estilosBoton }) {
  return <Link className={cx(baseBoton, estilosBoton[variante], className)} {...p} />;
}

const campo =
  "w-full rounded-xl border border-borde bg-white px-3.5 py-2.5 text-sm text-texto shadow-sm outline-none transition placeholder:text-slate-400 focus:border-marca focus:ring-4 focus:ring-marca/15 disabled:bg-slate-50 disabled:text-tenue";

export function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-medium text-slate-700">{etiqueta}</span>
      {children}
      {ayuda && <span className="block text-xs text-tenue">{ayuda}</span>}
    </label>
  );
}

export const Entrada = ({ className, ...p }: ComponentProps<"input">) => <input className={cx(campo, className)} {...p} />;
export const Selector = ({ className, ...p }: ComponentProps<"select">) => <select className={cx(campo, "pr-8", className)} {...p} />;
export const AreaTexto = ({ className, ...p }: ComponentProps<"textarea">) => (
  <textarea className={cx(campo, "min-h-28 leading-relaxed", className)} {...p} />
);

const tonos = {
  gris: "bg-slate-100 text-slate-600 ring-slate-200",
  verde: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ambar: "bg-amber-50 text-amber-700 ring-amber-200",
  rojo: "bg-red-50 text-red-700 ring-red-200",
  marca: "bg-marca/10 text-marca ring-marca/20",
};

export function Etiqueta({ tono = "gris", children }: { tono?: keyof typeof tonos; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", tonos[tono])}>
      {children}
    </span>
  );
}

export function Vacio({ children, icono: Icono }: { children: ReactNode; icono?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center text-sm text-tenue">
      {Icono && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-marca/10 text-marca">
          <Icono className="h-6 w-6" />
        </span>
      )}
      {children}
    </div>
  );
}

export function Tabla({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-borde/80 bg-superficie shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <table className="w-full text-left text-sm [&_tbody_tr:hover]:bg-slate-50/70 [&_tbody_tr]:border-t [&_tbody_tr]:border-borde/70 [&_td]:px-5 [&_td]:py-3.5 [&_th]:bg-slate-50 [&_th]:px-5 [&_th]:py-3 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-slate-500">
        {children}
      </table>
    </div>
  );
}

export function Avatar({ nombre, className }: { nombre: string; className?: string }) {
  const iniciales = nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span className={cx("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marca/10 text-xs font-semibold text-marca", className)}>
      {iniciales || "?"}
    </span>
  );
}

export function Indicador({
  titulo,
  valor,
  detalle,
  icono: Icono,
  href,
  tono = "marca",
}: {
  titulo: string;
  valor: ReactNode;
  detalle?: string;
  icono: LucideIcon;
  href?: string;
  tono?: "marca" | "verde" | "ambar" | "rojo";
}) {
  const fondoIcono = {
    marca: "bg-marca/10 text-marca",
    verde: "bg-emerald-50 text-emerald-600",
    ambar: "bg-amber-50 text-amber-600",
    rojo: "bg-red-50 text-red-600",
  }[tono];
  const contenido = (
    <Tarjeta className="group h-full p-5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-tenue">{titulo}</p>
        <span className={cx("flex h-9 w-9 items-center justify-center rounded-xl", fondoIcono)}>
          <Icono className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-texto">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-tenue">{detalle}</p>}
    </Tarjeta>
  );
  return href ? <Link href={href}>{contenido}</Link> : contenido;
}
