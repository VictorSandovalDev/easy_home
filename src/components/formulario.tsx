"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { EstadoAccion } from "@/lib/tipos";
import { Boton } from "./ui";

type Accion = (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;

/** Formulario ligado a una server action que muestra errores y confirmaciones. */
export function Formulario({
  accion,
  children,
  textoBoton = "Guardar",
  className = "space-y-4",
  variante,
}: {
  accion: Accion;
  children: React.ReactNode;
  textoBoton?: string;
  className?: string;
  variante?: "primario" | "secundario" | "peligro";
}) {
  const [estado, despachar] = useActionState(accion, undefined);
  return (
    <form action={despachar} className={className}>
      {children}
      {estado?.error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{estado.error}</p>}
      {estado?.ok && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">{estado.ok}</p>}
      <Enviar texto={textoBoton} variante={variante} />
    </form>
  );
}

function Enviar({ texto, variante }: { texto: string; variante?: "primario" | "secundario" | "peligro" }) {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" disabled={pending} variante={variante}>
      {pending ? "Procesando…" : texto}
    </Boton>
  );
}
