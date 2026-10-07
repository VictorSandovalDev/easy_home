import Link from "next/link";
import { notFound } from "next/navigation";
import { Formulario } from "@/components/formulario";
import { Etiqueta, Tarjeta } from "@/components/ui";
import { contextoConjunto } from "@/lib/contexto";
import { fecha, nombreUnidad } from "@/lib/tipos";
import { votar } from "../actions";
import { estadoVotacion } from "@/lib/votaciones";

type Resultado = { opcion_id: string; texto: string; votos: number; coeficiente: number };

export default async function Votacion({ params }: { params: Promise<{ conjunto: string; id: string }> }) {
  const { conjunto, id } = await params;
  const ctx = await contextoConjunto(conjunto);
  const { supabase } = ctx;

  const { data: v } = await supabase.from("votaciones").select("*").eq("id", id).eq("conjunto_id", ctx.conjunto.id).maybeSingle();
  if (!v) notFound();

  const [{ data: opciones }, { data: misVotos }, { data: resultados }, { data: unidades }] = await Promise.all([
    supabase.from("votacion_opciones").select("id, texto").eq("votacion_id", id).order("orden"),
    supabase.from("votos").select("unidad_id, opcion_id").eq("votacion_id", id).eq("usuario_id", ctx.user.id),
    supabase.rpc("resultados_votacion", { p_votacion: id }),
    supabase.from("unidades").select("coeficiente").eq("conjunto_id", ctx.conjunto.id),
  ]);

  const estado = estadoVotacion(v);
  const misUnidadesPropias = ctx.misUnidades.filter((u) => u.relacion === "propietario");
  const votoPorUnidad = new Map((misVotos ?? []).map((x) => [x.unidad_id, x.opcion_id]));
  const textoOpcion = new Map((opciones ?? []).map((o) => [o.id, o.texto]));
  const verResultados = ctx.esGestor || estado.texto === "Cerrada";

  const filas = (resultados ?? []) as Resultado[];
  const totalCoef = (unidades ?? []).reduce((s, u) => s + Number(u.coeficiente), 0);
  const totalUnidades = unidades?.length ?? 0;
  const votosEmitidos = filas.reduce((s, r) => s + Number(r.votos), 0);
  const coefEmitido = filas.reduce((s, r) => s + Number(r.coeficiente), 0);
  const base = v.ponderada ? coefEmitido : votosEmitidos;

  return (
    <div className="max-w-3xl space-y-4">
      <Link href={ctx.ruta("/votaciones")} className="text-sm text-tenue hover:underline">← Votaciones</Link>
      <Tarjeta>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Etiqueta tono={estado.tono}>{estado.texto}</Etiqueta>
          {v.ponderada && <Etiqueta tono="marca">Por coeficiente</Etiqueta>}
          <span className="text-sm text-tenue">{fecha(v.abre_en, true)} → {fecha(v.cierra_en, true)}</span>
        </div>
        <h1 className="text-2xl font-semibold">{v.titulo}</h1>
        {v.descripcion && <p className="mt-3 whitespace-pre-wrap text-tenue">{v.descripcion}</p>}
      </Tarjeta>

      {estado.texto === "Abierta" && misUnidadesPropias.length > 0 && (
        <Tarjeta>
          <h2 className="mb-3 font-semibold">Tu voto</h2>
          {misUnidadesPropias.map(({ unidad }) => (
            <div key={unidad.id} className="mb-4 border-b border-borde pb-4 last:mb-0 last:border-0 last:pb-0">
              <p className="mb-2 text-sm">
                Unidad <strong>{nombreUnidad(unidad)}</strong>
                {votoPorUnidad.has(unidad.id) && <> · votaste: <strong>{textoOpcion.get(votoPorUnidad.get(unidad.id)!)}</strong></>}
              </p>
              <Formulario accion={votar.bind(null, conjunto, id)} textoBoton={votoPorUnidad.has(unidad.id) ? "Cambiar voto" : "Votar"} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="unidad_id" value={unidad.id} />
                <div className="flex flex-wrap gap-3">
                  {opciones?.map((o) => (
                    <label key={o.id} className="flex items-center gap-2 rounded-lg border border-borde px-3 py-2 text-sm has-[:checked]:border-marca has-[:checked]:bg-marca/5">
                      <input type="radio" name="opcion_id" value={o.id} required defaultChecked={votoPorUnidad.get(unidad.id) === o.id} className="accent-marca" />
                      {o.texto}
                    </label>
                  ))}
                </div>
              </Formulario>
            </div>
          ))}
        </Tarjeta>
      )}
      {estado.texto === "Abierta" && misUnidadesPropias.length === 0 && (
        <p className="text-sm text-tenue">Solo los propietarios pueden votar en esta consulta.</p>
      )}

      {verResultados ? (
        <Tarjeta>
          <h2 className="mb-1 font-semibold">Resultados {estado.texto !== "Cerrada" && <span className="text-sm font-normal text-tenue">(parciales)</span>}</h2>
          <p className="mb-4 text-sm text-tenue">
            Participación: {votosEmitidos} de {totalUnidades} unidades
            {v.ponderada && totalCoef > 0 && <> · {coefEmitido.toFixed(3)}% de {totalCoef.toFixed(3)}% del coeficiente</>}
          </p>
          <div className="space-y-3">
            {filas.map((r) => {
              const valor = v.ponderada ? Number(r.coeficiente) : Number(r.votos);
              const pct = base > 0 ? (valor / base) * 100 : 0;
              return (
                <div key={r.opcion_id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{r.texto}</span>
                    <span className="text-tenue">{r.votos} voto{Number(r.votos) === 1 ? "" : "s"} · {pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-fondo">
                    <div className="h-2 rounded-full bg-marca" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Tarjeta>
      ) : (
        <p className="text-sm text-tenue">Los resultados se publican al cierre de la votación.</p>
      )}
    </div>
  );
}
