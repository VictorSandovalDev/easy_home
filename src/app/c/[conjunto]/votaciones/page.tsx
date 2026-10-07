import Link from "next/link";
import { BotonLink, Encabezado, Etiqueta, Tarjeta, Vacio } from "@/components/ui";
import { contextoConjunto } from "@/lib/contexto";
import { fecha } from "@/lib/tipos";
import { estadoVotacion } from "@/lib/votaciones";

export const metadata = { title: "Votaciones" };

export default async function Votaciones({ params }: { params: Promise<{ conjunto: string }> }) {
  const ctx = await contextoConjunto((await params).conjunto);
  const { data } = await ctx.supabase
    .from("votaciones")
    .select("id, titulo, descripcion, emisor, abre_en, cierra_en, ponderada")
    .eq("conjunto_id", ctx.conjunto.id)
    .order("cierra_en", { ascending: false });

  return (
    <>
      <Encabezado
        titulo="Votaciones y consultas"
        descripcion="Cada unidad tiene un voto, emitido por su propietario."
        accion={ctx.esGestor && <BotonLink href={ctx.ruta("/votaciones/nueva")}>Nueva votación</BotonLink>}
      />
      {!data?.length && <Vacio>No hay votaciones.</Vacio>}
      <div className="space-y-3">
        {data?.map((v) => {
          const e = estadoVotacion(v);
          return (
            <Link key={v.id} href={ctx.ruta(`/votaciones/${v.id}`)} className="block">
              <Tarjeta className="hover:border-marca">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Etiqueta tono={e.tono}>{e.texto}</Etiqueta>
                  <Etiqueta>{v.emisor === "consejo" ? "Consejo" : "Administración"}</Etiqueta>
                  {v.ponderada && <Etiqueta tono="marca">Por coeficiente</Etiqueta>}
                  <span className="ml-auto text-xs text-tenue">Cierra {fecha(v.cierra_en, true)}</span>
                </div>
                <h2 className="font-semibold">{v.titulo}</h2>
                {v.descripcion && <p className="mt-1 line-clamp-2 text-sm text-tenue">{v.descripcion}</p>}
              </Tarjeta>
            </Link>
          );
        })}
      </div>
    </>
  );
}
