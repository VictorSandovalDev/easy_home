import Link from "next/link";
import { notFound } from "next/navigation";
import { FilasHuespedes } from "@/components/filas-huespedes";
import { Formulario } from "@/components/formulario";
import { Boton, Etiqueta, Tabla, Tarjeta } from "@/components/ui";
import { contextoConjunto } from "@/lib/contexto";
import { nombrePerfil, perfilesPorId } from "@/lib/perfiles";
import { ESTADO_RESERVA } from "@/lib/reservas";
import { fecha, nombreUnidad } from "@/lib/tipos";
import { agregarHuespedes, cambiarEstadoReserva, quitarHuesped } from "../actions";

export default async function Reserva({ params }: { params: Promise<{ conjunto: string; id: string }> }) {
  const { conjunto, id } = await params;
  const ctx = await contextoConjunto(conjunto);
  const { data } = await ctx.supabase
    .from("reservas")
    .select("*, unidad:unidades(id, torre, numero), huespedes(*, accesos(tipo, registrado_en))")
    .eq("id", id)
    .eq("conjunto_id", ctx.conjunto.id)
    .maybeSingle();
  if (!data) notFound();
  const r = data as unknown as {
    id: string; plataforma: string; codigo_reserva: string | null; check_in: string; check_out: string;
    notas: string | null; registrada_por: string;
    estado: keyof typeof ESTADO_RESERVA;
    unidad: { id: string; torre: string | null; numero: string };
    huespedes: {
      id: string; nombre: string; tipo_documento: string; numero_documento: string; nacionalidad: string;
      telefono: string | null; es_menor: boolean; placa_vehiculo: string | null;
      accesos: { tipo: "ingreso" | "salida"; registrado_en: string }[];
    }[];
  };
  const perfiles = await perfilesPorId(ctx.supabase, [r.registrada_por]);
  const esResponsable = ctx.misUnidades.some((u) => u.unidad.id === r.unidad.id && u.relacion !== "arrendatario");
  const editable = esResponsable && ["programada", "en_curso"].includes(r.estado);

  return (
    <div className="space-y-4">
      <Link href={ctx.ruta("/reservas")} className="text-sm text-tenue hover:underline">← Huéspedes</Link>
      <Tarjeta>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Etiqueta tono={ESTADO_RESERVA[r.estado].tono}>{ESTADO_RESERVA[r.estado].texto}</Etiqueta>
          <span className="text-sm capitalize text-tenue">{r.plataforma}{r.codigo_reserva && ` · ${r.codigo_reserva}`}</span>
        </div>
        <h1 className="text-2xl font-semibold">Unidad {nombreUnidad(r.unidad)}</h1>
        <p className="mt-1 text-tenue">{fecha(r.check_in)} → {fecha(r.check_out)} · registrada por {nombrePerfil(perfiles.get(r.registrada_por))}</p>
        {r.notas && <p className="mt-3 rounded-lg bg-fondo p-3 text-sm">{r.notas}</p>}
        {editable && (
          <form action={cambiarEstadoReserva.bind(null, conjunto, id, "cancelada")} className="mt-4">
            <Boton variante="secundario" className="text-red-600">Cancelar reserva</Boton>
          </form>
        )}
      </Tarjeta>

      <Tabla>
        <thead><tr><th>Huésped</th><th>Documento</th><th>Nacionalidad</th><th>Contacto</th><th>Último acceso</th>{editable && <th />}</tr></thead>
        <tbody>
          {r.huespedes.map((h) => {
            const ultimo = [...h.accesos].sort((a, b) => b.registrado_en.localeCompare(a.registrado_en))[0];
            return (
              <tr key={h.id}>
                <td>{h.nombre} {h.es_menor && <Etiqueta>Menor</Etiqueta>}</td>
                <td>{h.tipo_documento} {h.numero_documento}</td>
                <td>{h.nacionalidad}</td>
                <td>{h.telefono}{h.placa_vehiculo && <span className="text-tenue"> · 🚗 {h.placa_vehiculo}</span>}</td>
                <td>{ultimo ? <>{ultimo.tipo === "ingreso" ? "Ingresó" : "Salió"} {fecha(ultimo.registrado_en, true)}</> : <span className="text-tenue">Sin registro</span>}</td>
                {editable && (
                  <td>
                    <form action={quitarHuesped.bind(null, conjunto, id, h.id)}>
                      <button className="text-sm text-red-600 hover:underline">Quitar</button>
                    </form>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </Tabla>

      {editable && (
        <Tarjeta>
          <h2 className="mb-3 font-semibold">Agregar huéspedes</h2>
          <Formulario accion={agregarHuespedes.bind(null, conjunto, id)} textoBoton="Agregar">
            <FilasHuespedes />
          </Formulario>
        </Tarjeta>
      )}
    </div>
  );
}
