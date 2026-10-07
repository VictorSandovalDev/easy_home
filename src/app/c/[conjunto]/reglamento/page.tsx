import { ClipboardList } from "lucide-react";
import { Formulario } from "@/components/formulario";
import { AreaTexto, Campo, Encabezado, Entrada, Etiqueta, Tarjeta, Vacio } from "@/components/ui";
import { contextoConjunto } from "@/lib/contexto";
import { alternarSancionable, guardarArticulo, importarReglamento } from "./actions";

export const metadata = { title: "Reglamento de Propiedad Horizontal" };

type Articulo = { id: string; capitulo: string | null; numero: string; titulo: string; texto: string; sancionable: boolean };

export default async function Reglamento({
  params,
  searchParams,
}: {
  params: Promise<{ conjunto: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { conjunto } = await params;
  const { q } = await searchParams;
  const ctx = await contextoConjunto(conjunto);

  let consulta = ctx.supabase.from("rph_articulos").select("id, capitulo, numero, titulo, texto, sancionable").eq("conjunto_id", ctx.conjunto.id);
  if (q) consulta = consulta.or(`titulo.ilike.%${q.replace(/[%,()]/g, "")}%,texto.ilike.%${q.replace(/[%,()]/g, "")}%,numero.eq.${q.replace(/[%,()]/g, "")}`);
  const { data } = await consulta;
  const articulos = ((data ?? []) as Articulo[]).sort((a, b) => a.numero.localeCompare(b.numero, "es", { numeric: true }));

  return (
    <>
      <Encabezado titulo="Reglamento de Propiedad Horizontal" descripcion="Base para llamados de atención y multas." />

      <form className="mb-4 flex gap-2">
        <Entrada name="q" defaultValue={q} placeholder="Buscar por número, título o texto (ej: mascotas, ruido, parqueadero)" />
      </form>

      <div className={ctx.esAdministracion ? "grid gap-6 lg:grid-cols-[1fr_340px]" : ""}>
        <div className="space-y-3">
          {!articulos.length && <Vacio icono={ClipboardList}>{q ? "Sin resultados." : "El reglamento aún no ha sido cargado."}</Vacio>}
          {articulos.map((a) => (
            <Tarjeta key={a.id} id={`art-${a.numero}`}>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-tenue">Art. {a.numero}</span>
                {a.capitulo && <span className="text-xs text-tenue">· {a.capitulo}</span>}
                {a.sancionable && <Etiqueta tono="ambar">Sancionable</Etiqueta>}
                {ctx.esAdministracion && (
                  <form action={alternarSancionable.bind(null, conjunto, a.id, !a.sancionable)} className="ml-auto">
                    <button className="text-xs text-tenue hover:text-marca">
                      {a.sancionable ? "Quitar sancionable" : "Marcar sancionable"}
                    </button>
                  </form>
                )}
              </div>
              <h2 className="font-semibold">{a.titulo}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{a.texto}</p>
            </Tarjeta>
          ))}
        </div>

        {ctx.esAdministracion && (
          <div className="space-y-6">
            <Tarjeta>
              <h2 className="mb-1 font-semibold">Importar reglamento</h2>
              <p className="mb-3 text-xs text-tenue">Pega el texto del RPH. Cada artículo debe iniciar con «ARTÍCULO N».</p>
              <Formulario accion={importarReglamento.bind(null, conjunto)} textoBoton="Importar">
                <AreaTexto name="texto" rows={8} required placeholder={"ARTÍCULO 1. Objeto. El presente reglamento…\nARTÍCULO 2. …"} />
              </Formulario>
            </Tarjeta>
            <Tarjeta>
              <h2 className="mb-3 font-semibold">Agregar o editar artículo</h2>
              <Formulario accion={guardarArticulo.bind(null, conjunto)}>
                <div className="grid grid-cols-3 gap-3">
                  <Campo etiqueta="Número"><Entrada name="numero" required /></Campo>
                  <div className="col-span-2"><Campo etiqueta="Capítulo"><Entrada name="capitulo" /></Campo></div>
                </div>
                <Campo etiqueta="Título"><Entrada name="titulo" required /></Campo>
                <Campo etiqueta="Texto"><AreaTexto name="texto" required /></Campo>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="sancionable" className="accent-marca" /> Su incumplimiento es sancionable
                </label>
              </Formulario>
            </Tarjeta>
          </div>
        )}
      </div>
    </>
  );
}
