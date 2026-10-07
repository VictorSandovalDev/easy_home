import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Tarjeta({ className, ...p }: ComponentProps<"div">) {
  return <div className={cx("rounded-xl border border-borde bg-superficie p-5", className)} {...p} />;
}

export function Encabezado({ titulo, descripcion, accion }: { titulo: string; descripcion?: string; accion?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descripcion && <p className="mt-1 text-sm text-tenue">{descripcion}</p>}
      </div>
      {accion}
    </div>
  );
}

const estilosBoton = {
  primario: "bg-marca text-white hover:opacity-90",
  secundario: "border border-borde bg-superficie hover:bg-fondo",
  peligro: "bg-red-600 text-white hover:bg-red-700",
};

export function Boton({
  variante = "primario",
  className,
  ...p
}: ComponentProps<"button"> & { variante?: keyof typeof estilosBoton }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50",
        estilosBoton[variante],
        className,
      )}
      {...p}
    />
  );
}

export function BotonLink({
  variante = "primario",
  className,
  ...p
}: ComponentProps<typeof Link> & { variante?: keyof typeof estilosBoton }) {
  return (
    <Link
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
        estilosBoton[variante],
        className,
      )}
      {...p}
    />
  );
}

const campo =
  "w-full rounded-lg border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-marca focus:ring-2 focus:ring-marca/20";

export function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{etiqueta}</span>
      {children}
      {ayuda && <span className="block text-xs text-tenue">{ayuda}</span>}
    </label>
  );
}

export const Entrada = ({ className, ...p }: ComponentProps<"input">) => <input className={cx(campo, className)} {...p} />;
export const Selector = ({ className, ...p }: ComponentProps<"select">) => <select className={cx(campo, className)} {...p} />;
export const AreaTexto = ({ className, ...p }: ComponentProps<"textarea">) => (
  <textarea className={cx(campo, "min-h-28", className)} {...p} />
);

const tonos = {
  gris: "bg-gray-500/10 text-tenue",
  verde: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  ambar: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  rojo: "bg-red-500/10 text-red-700 dark:text-red-400",
  marca: "bg-marca/10 text-marca",
};

export function Etiqueta({ tono = "gris", children }: { tono?: keyof typeof tonos; children: ReactNode }) {
  return <span className={cx("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", tonos[tono])}>{children}</span>;
}

export function Vacio({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-borde p-10 text-center text-sm text-tenue">{children}</div>;
}

export function Tabla({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-borde bg-superficie">
      <table className="w-full text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-2 [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:text-tenue [&_tr]:border-b [&_tr]:border-borde [&_tbody_tr:last-child]:border-0">
        {children}
      </table>
    </div>
  );
}
