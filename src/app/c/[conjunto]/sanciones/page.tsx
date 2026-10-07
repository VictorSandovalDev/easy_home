import { Gavel } from "lucide-react";
import Link from "next/link";
import { BotonLink, Encabezado, Etiqueta, Tabla, Vacio } from "@/components/ui";
import { contextoConjunto } from "@/lib/contexto";
import { nombrePerfil, perfilesPorId } from "@/lib/perfiles";
import { ESTADO_SANCION, TIPO_SANCION } from "@/lib/sanciones";
import { fecha, nombreUnidad, pesos } from "@/lib/tipos";

export const metadata = { title: "Sanciones" };

export default async function Sanciones({ params }: { params: Promise<{ conjunto: string }> }) {
  const ctx = await contextoConjunto((await params).conjunto);
  const { data } = await ctx.supabase
    .from("sanciones")
    .select("id, tipo, estado, valor, creado_en, plazo_descargos, destinatario_id, unidad:unidades(torre, numero), articulo:rph_articulos(numero)")
    .eq("conjunto_id", ctx.conjunto.id)
    .order("creado_en", { ascending: false });
  const sanciones = (data ?? []) as unknown as {
    id: string; tipo: keyof typeof TIPO_SANCION; estado: keyof typeof ESTADO_SANCION; valor: number; creado_en: string;
    plazo_descargos: string; destinatario_id: string; unidad: { torre: string | null; numero: string }; articulo: { numero: string } | null;
  }[];
  const perfiles = await perfilesPorId(ctx.supabase, sanciones.map((s) => s.destinatario_id));

  return (
    <>
      <Encabezado
        titulo={ctx.esGestor ? "Llamados de atención y multas" : "Mis notificaciones"}
        descripcion="Con derecho a descargos antes de cualquier decisión (Ley 675 de 2001, arts. 59 y 60)."
        accion={ctx.esAdministracion && <BotonLink href={ctx.ruta("/sanciones/nueva")}>Nueva notificación</BotonLink>}
      />
      {!sanciones.length ? (
        <Vacio icono={Gavel}>No hay notificaciones.</Vacio>
      ) : (
        <Tabla>
          <thead><tr><th>Fecha</th><th>Unidad</th><th>Destinatario</th><th>Tipo</th><th>Art.</th><th>Valor</th><th>Estado</th></tr></thead>
          <tbody>
            {sanciones.map((s) => (
              <tr key={s.id}>
                <td><Link href={ctx.ruta(`/sanciones/${s.id}`)} className="font-medium hover:underline">{fecha(s.creado_en)}</Link></td>
                <td>{nombreUnidad(s.unidad)}</td>
                <td>{nombrePerfil(perfiles.get(s.destinatario_id))}</td>
                <td>{TIPO_SANCION[s.tipo]}</td>
                <td>{s.articulo?.numero ?? "—"}</td>
                <td>{s.tipo === "multa" ? pesos(s.valor) : "—"}</td>
                <td><Etiqueta tono={ESTADO_SANCION[s.estado].tono}>{ESTADO_SANCION[s.estado].texto}</Etiqueta></td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </>
  );
}
