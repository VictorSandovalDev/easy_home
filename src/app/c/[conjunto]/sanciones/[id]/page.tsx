import { notFound } from "next/navigation";
import { Formulario } from "@/components/formulario";
import { AreaTexto, Campo, Etiqueta, Selector, Tarjeta, Volver } from "@/components/ui";
import { contextoConjunto } from "@/lib/contexto";
import { nombrePerfil, perfilesPorId } from "@/lib/perfiles";
import { ESTADO_SANCION, TIPO_SANCION } from "@/lib/sanciones";
import { fecha, nombreUnidad, pesos, hoyColombia } from "@/lib/tipos";
import { decidirSancion, presentarDescargos } from "../actions";

export default async function Sancion({ params }: { params: Promise<{ conjunto: string; id: string }> }) {
  const { conjunto, id } = await params;
  const ctx = await contextoConjunto(conjunto);
  const { data } = await ctx.supabase
    .from("sanciones")
    .select("*, unidad:unidades(torre, numero), articulo:rph_articulos(numero, titulo, texto)")
    .eq("id", id)
    .eq("conjunto_id", ctx.conjunto.id)
    .maybeSingle();
  if (!data) notFound();
  const s = data as unknown as {
    id: string; valor: number; hechos: string; fecha_hechos: string; plazo_descargos: string; creado_en: string;
    destinatario_id: string; creada_por: string;
    tipo: keyof typeof TIPO_SANCION; estado: keyof typeof ESTADO_SANCION;
    unidad: { torre: string | null; numero: string }; articulo: { numero: string; titulo: string; texto: string } | null;
  };

  const { data: eventos } = await ctx.supabase.from("sancion_eventos").select("*").eq("sancion_id", id).order("creado_en");
  const perfiles = await perfilesPorId(ctx.supabase, [s.destinatario_id, s.creada_por, ...(eventos ?? []).map((e) => e.autor_id)]);

  const hoy = hoyColombia();
  const puedeDescargar = s.destinatario_id === ctx.user.id && hoy <= s.plazo_descargos && ["notificada", "en_descargos"].includes(s.estado);
  const puedeDecidir = ctx.esAdministracion && !["revocada", "pagada"].includes(s.estado);

  return (
    <div className="max-w-3xl space-y-4">
      <Volver href={ctx.ruta("/sanciones")}>Volver</Volver>
      <Tarjeta>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Etiqueta tono={ESTADO_SANCION[s.estado].tono}>{ESTADO_SANCION[s.estado].texto}</Etiqueta>
          <span className="text-sm text-tenue">Notificada el {fecha(s.creado_en)} · descargos hasta {fecha(s.plazo_descargos)}</span>
        </div>
        <h1 className="text-2xl font-semibold">
          {TIPO_SANCION[s.tipo]}{s.tipo === "multa" && <> · {pesos(s.valor)}</>}
        </h1>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-tenue">Unidad</dt><dd>{nombreUnidad(s.unidad)}</dd></div>
          <div><dt className="text-tenue">Destinatario</dt><dd>{nombrePerfil(perfiles.get(s.destinatario_id))}</dd></div>
          <div><dt className="text-tenue">Fecha de los hechos</dt><dd>{fecha(s.fecha_hechos)}</dd></div>
          <div><dt className="text-tenue">Emitida por</dt><dd>{nombrePerfil(perfiles.get(s.creada_por))} (Administración)</dd></div>
        </dl>
        <h2 className="mt-5 text-sm font-medium text-tenue">Hechos</h2>
        <p className="mt-1 whitespace-pre-wrap">{s.hechos}</p>
        {s.articulo && (
          <blockquote className="mt-5 border-l-4 border-marca bg-marca/5 p-3 text-sm">
            <p className="font-medium">Art. {s.articulo.numero} · {s.articulo.titulo}</p>
            <p className="mt-1 whitespace-pre-wrap text-tenue">{s.articulo.texto}</p>
          </blockquote>
        )}
      </Tarjeta>

      <Tarjeta>
        <h2 className="mb-3 font-semibold">Trazabilidad del proceso</h2>
        {!eventos?.length && <p className="text-sm text-tenue">Aún no hay descargos ni decisiones.</p>}
        <ol className="space-y-3">
          {eventos?.map((e) => (
            <li key={e.id} className="rounded-lg border border-borde p-3">
              <p className="mb-1 text-xs text-tenue">
                {e.tipo === "descargo" ? "Descargos" : e.tipo === "decision" ? "Decisión" : "Nota"} · {nombrePerfil(perfiles.get(e.autor_id))} · {fecha(e.creado_en, true)}
              </p>
              <p className="whitespace-pre-wrap text-sm">{e.texto}</p>
            </li>
          ))}
        </ol>
      </Tarjeta>

      {puedeDescargar && (
        <Tarjeta>
          <h2 className="mb-3 font-semibold">Presentar descargos</h2>
          <Formulario accion={presentarDescargos.bind(null, conjunto, id)} textoBoton="Enviar descargos">
            <AreaTexto name="texto" required rows={5} placeholder="Explica tu versión de los hechos y aporta las pruebas que consideres." />
          </Formulario>
        </Tarjeta>
      )}

      {puedeDecidir && (
        <Tarjeta>
          <h2 className="mb-3 font-semibold">Decisión de la administración</h2>
          {hoy <= s.plazo_descargos && s.estado === "notificada" && (
            <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              El plazo de descargos sigue abierto. Para respetar el debido proceso, espera a que venza o a recibir los descargos antes de confirmar.
            </p>
          )}
          <Formulario accion={decidirSancion.bind(null, conjunto, id)} textoBoton="Registrar decisión">
            <Campo etiqueta="Decisión">
              <Selector name="estado">
                <option value="confirmada">Confirmar</option>
                <option value="revocada">Revocar</option>
                {s.tipo === "multa" && <option value="pagada">Registrar pago</option>}
              </Selector>
            </Campo>
            <Campo etiqueta="Motivación"><AreaTexto name="texto" required rows={4} /></Campo>
          </Formulario>
        </Tarjeta>
      )}
    </div>
  );
}
