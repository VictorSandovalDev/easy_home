"use client";

import { useState } from "react";
import { Entrada, Selector } from "./ui";

/** Filas dinámicas de huéspedes; cada campo se envía como lista (getAll) en el FormData. */
export function FilasHuespedes() {
  const [filas, setFilas] = useState([0]);
  const [siguiente, setSiguiente] = useState(1);

  return (
    <div className="space-y-3">
      {filas.map((id, i) => (
        <div key={id} className="grid gap-2 rounded-lg border border-borde p-3 sm:grid-cols-6">
          <Entrada name="h_nombre" placeholder="Nombre completo" required className="sm:col-span-2" />
          <Selector name="h_tipo_documento" defaultValue="CC">
            <option>CC</option><option>CE</option><option>PP</option><option>TI</option><option>PEP</option><option>PPT</option>
          </Selector>
          <Entrada name="h_numero_documento" placeholder="Número de documento" required />
          <Entrada name="h_nacionalidad" placeholder="Nacionalidad" defaultValue="Colombia" />
          <Entrada name="h_telefono" placeholder="Celular" />
          <Entrada name="h_placa" placeholder="Placa vehículo (opcional)" className="sm:col-span-2" />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="h_menor" value={i} className="accent-marca" /> Menor de edad
          </label>
          {filas.length > 1 && (
            <button type="button" onClick={() => setFilas(filas.filter((f) => f !== id))} className="text-left text-sm text-red-600 sm:col-span-2 sm:text-right">
              Quitar
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          setFilas([...filas, siguiente]);
          setSiguiente(siguiente + 1);
        }}
        className="text-sm font-medium text-marca hover:underline"
      >
        + Agregar huésped
      </button>
    </div>
  );
}
