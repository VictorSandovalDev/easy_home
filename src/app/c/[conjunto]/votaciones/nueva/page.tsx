import { Formulario } from "@/components/formulario";
import { AreaTexto, Campo, Encabezado, Entrada, Selector, Tarjeta } from "@/components/ui";
import { exigir } from "@/lib/contexto";
import { NOMBRE_ROL } from "@/lib/tipos";
import { crearVotacion } from "../actions";

export const metadata = { title: "Nueva votación" };

const local = (d: Date) => new Date(d.getTime() - 5 * 3600_000).toISOString().slice(0, 16);

export default async function NuevaVotacion({ params }: { params: Promise<{ conjunto: string }> }) {
  const { conjunto } = await params;
  const ctx = await exigir(conjunto, "administracion", "consejo");
  const emisores = (["administracion", "consejo"] as const).filter((e) => ctx.tiene(e));
  const ahora = new Date();

  return (
    <>
      <Encabezado titulo="Nueva votación o consulta" />
      <Tarjeta className="max-w-2xl">
        <Formulario accion={crearVotacion.bind(null, conjunto)} textoBoton="Crear votación">
          <Campo etiqueta="Convoca">
            <Selector name="emisor">{emisores.map((e) => <option key={e} value={e}>{NOMBRE_ROL[e]}</option>)}</Selector>
          </Campo>
          <Campo etiqueta="Pregunta"><Entrada name="titulo" required placeholder="¿Aprueba el cambio de horario de la piscina?" /></Campo>
          <Campo etiqueta="Contexto"><AreaTexto name="descripcion" rows={4} /></Campo>
          <Campo etiqueta="Opciones" ayuda="Una por línea.">
            <AreaTexto name="opciones" required rows={4} defaultValue={"Sí\nNo\nMe abstengo"} />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Abre (hora Colombia)"><Entrada type="datetime-local" name="abre_en" required defaultValue={local(ahora)} /></Campo>
            <Campo etiqueta="Cierra (hora Colombia)"><Entrada type="datetime-local" name="cierra_en" required defaultValue={local(new Date(ahora.getTime() + 7 * 86400_000))} /></Campo>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="ponderada" defaultChecked className="accent-marca" />
            Ponderar resultados por coeficiente de copropiedad (Ley 675, art. 37)
          </label>
        </Formulario>
      </Tarjeta>
    </>
  );
}
