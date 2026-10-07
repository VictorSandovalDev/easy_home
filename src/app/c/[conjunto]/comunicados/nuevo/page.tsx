import { Formulario } from "@/components/formulario";
import { AreaTexto, Campo, Encabezado, Entrada, Selector, Tarjeta } from "@/components/ui";
import { exigir } from "@/lib/contexto";
import { NOMBRE_ROL, ROLES } from "@/lib/tipos";
import { publicarComunicado } from "../actions";

export const metadata = { title: "Nuevo comunicado" };

export default async function NuevoComunicado({ params }: { params: Promise<{ conjunto: string }> }) {
  const { conjunto } = await params;
  const ctx = await exigir(conjunto, "administracion", "consejo");
  const emisores = (["administracion", "consejo"] as const).filter((e) => ctx.tiene(e));

  return (
    <>
      <Encabezado titulo="Nuevo comunicado" />
      <Tarjeta className="max-w-2xl">
        <Formulario accion={publicarComunicado.bind(null, conjunto)} textoBoton="Publicar">
          <Campo etiqueta="Publicar como">
            <Selector name="emisor">
              {emisores.map((e) => <option key={e} value={e}>{NOMBRE_ROL[e]}</option>)}
            </Selector>
          </Campo>
          <Campo etiqueta="Título"><Entrada name="titulo" required maxLength={160} /></Campo>
          <Campo etiqueta="Mensaje"><AreaTexto name="cuerpo" required rows={10} /></Campo>
          <fieldset>
            <legend className="text-sm font-medium">Destinatarios</legend>
            <p className="mb-2 text-xs text-tenue">Si no marcas ninguno, lo verá todo el conjunto.</p>
            <div className="flex flex-wrap gap-3">
              {ROLES.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="audiencia" value={r} className="accent-marca" /> {NOMBRE_ROL[r]}
                </label>
              ))}
            </div>
          </fieldset>
        </Formulario>
      </Tarjeta>
    </>
  );
}
