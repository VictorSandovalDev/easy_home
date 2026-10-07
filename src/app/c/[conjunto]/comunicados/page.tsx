import { Megaphone } from "lucide-react";
import Link from "next/link";
import { BotonLink, Encabezado, Etiqueta, Tarjeta, Vacio } from "@/components/ui";
import { contextoConjunto } from "@/lib/contexto";
import { fecha, NOMBRE_ROL, type Rol } from "@/lib/tipos";

export const metadata = { title: "Comunicados" };

export default async function Comunicados({ params }: { params: Promise<{ conjunto: string }> }) {
  const ctx = await contextoConjunto((await params).conjunto);
  const [{ data: comunicados }, { data: lecturas }] = await Promise.all([
    ctx.supabase.from("comunicados").select("id, titulo, cuerpo, emisor, audiencia, creado_en").eq("conjunto_id", ctx.conjunto.id).order("creado_en", { ascending: false }),
    ctx.supabase.from("comunicado_lecturas").select("comunicado_id").eq("usuario_id", ctx.user.id),
  ]);
  const leidos = new Set((lecturas ?? []).map((l) => l.comunicado_id));

  return (
    <>
      <Encabezado
        titulo="Comunicados"
        descripcion="Información oficial del consejo y la administración."
        accion={ctx.esGestor && <BotonLink href={ctx.ruta("/comunicados/nuevo")}>Nuevo comunicado</BotonLink>}
      />
      {!comunicados?.length && <Vacio icono={Megaphone}>No hay comunicados publicados.</Vacio>}
      <div className="space-y-3">
        {comunicados?.map((c) => (
          <Link key={c.id} href={ctx.ruta(`/comunicados/${c.id}`)} className="block">
            <Tarjeta className="hover:border-marca">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Etiqueta tono="marca">{c.emisor === "consejo" ? "Consejo" : "Administración"}</Etiqueta>
                {!leidos.has(c.id) && <Etiqueta tono="ambar">Nuevo</Etiqueta>}
                {(c.audiencia as Rol[]).length > 0 && (
                  <span className="text-xs text-tenue">Para: {(c.audiencia as Rol[]).map((r) => NOMBRE_ROL[r]).join(", ")}</span>
                )}
                <span className="ml-auto text-xs text-tenue">{fecha(c.creado_en, true)}</span>
              </div>
              <h2 className="font-semibold">{c.titulo}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-tenue">{c.cuerpo}</p>
            </Tarjeta>
          </Link>
        ))}
      </div>
    </>
  );
}
