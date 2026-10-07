import { FilasHuespedes } from "@/components/filas-huespedes";
import { Formulario } from "@/components/formulario";
import { AreaTexto, Campo, Encabezado, Entrada, Selector, Tarjeta, Vacio } from "@/components/ui";
import { contextoConjunto } from "@/lib/contexto";
import { PLATAFORMAS } from "@/lib/reservas";
import { nombreUnidad, hoyColombia } from "@/lib/tipos";
import { crearReserva } from "../actions";

export const metadata = { title: "Registrar reserva" };

export default async function NuevaReserva({ params }: { params: Promise<{ conjunto: string }> }) {
  const { conjunto } = await params;
  const ctx = await contextoConjunto(conjunto);
  const unidades = ctx.misUnidades.filter((u) => u.relacion !== "arrendatario" && u.unidad.permite_renta_corta);
  const hoy = hoyColombia();

  if (!ctx.conjunto.permite_renta_corta) return <Vacio>El reglamento de este conjunto no permite renta corta.</Vacio>;
  if (!unidades.length) return <Vacio>No tienes unidades habilitadas para renta corta. Solicítalo a la administración.</Vacio>;

  return (
    <>
      <Encabezado titulo="Registrar reserva" descripcion="Portería verificará el documento de cada huésped al ingreso." />
      <Tarjeta className="max-w-3xl">
        <Formulario accion={crearReserva.bind(null, conjunto)} textoBoton="Registrar reserva">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Unidad">
              <Selector name="unidad_id">
                {unidades.map(({ unidad }) => <option key={unidad.id} value={unidad.id}>{nombreUnidad(unidad)}</option>)}
              </Selector>
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Plataforma">
                <Selector name="plataforma" className="capitalize">{PLATAFORMAS.map((p) => <option key={p}>{p}</option>)}</Selector>
              </Campo>
              <Campo etiqueta="Código reserva"><Entrada name="codigo_reserva" placeholder="HMXXXXXX" /></Campo>
            </div>
            <Campo etiqueta="Llegada (check-in)"><Entrada type="date" name="check_in" required min={hoy} defaultValue={hoy} /></Campo>
            <Campo etiqueta="Salida (check-out)"><Entrada type="date" name="check_out" required min={hoy} /></Campo>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Huéspedes</p>
            <FilasHuespedes />
          </div>
          <Campo etiqueta="Notas para portería"><AreaTexto name="notas" rows={2} placeholder="Hora estimada de llegada, mascotas, etc." /></Campo>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="autoriza" required className="mt-1 accent-marca" />
            <span>
              Declaro que los huéspedes autorizaron el tratamiento de sus datos personales para control de acceso al conjunto
              (Ley 1581 de 2012) y que la información es veraz.
            </span>
          </label>
        </Formulario>
      </Tarjeta>
    </>
  );
}
