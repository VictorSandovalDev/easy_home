import Link from "next/link";
import { BotonLink, Encabezado, Etiqueta, Tabla, Vacio } from "@/components/ui";
import { contextoConjunto } from "@/lib/contexto";
import { ESTADO_RESERVA } from "@/lib/reservas";
import { fecha, nombreUnidad, hoyColombia } from "@/lib/tipos";

export const metadata = { title: "Huéspedes" };

export default async function Reservas({
  params,
  searchParams,
}: {
  params: Promise<{ conjunto: string }>;
  searchParams: Promise<{ ver?: string }>;
}) {
  const ctx = await contextoConjunto((await params).conjunto);
  const { ver } = await searchParams;
  const hoy = hoyColombia();

  let q = ctx.supabase
    .from("reservas")
    .select("id, plataforma, codigo_reserva, check_in, check_out, estado, unidad:unidades(torre, numero), huespedes(count)")
    .eq("conjunto_id", ctx.conjunto.id)
    .order("check_in", { ascending: ver === "historial" ? false : true });
  q = ver === "historial" ? q.lt("check_out", hoy) : q.gte("check_out", hoy);
  const { data } = await q;
  const reservas = (data ?? []) as unknown as {
    id: string; plataforma: string; codigo_reserva: string | null; check_in: string; check_out: string;
    estado: keyof typeof ESTADO_RESERVA; unidad: { torre: string | null; numero: string }; huespedes: { count: number }[];
  }[];

  const puedeRegistrar = ctx.misUnidades.some((u) => u.relacion !== "arrendatario" && u.unidad.permite_renta_corta);

  return (
    <>
      <Encabezado
        titulo="Huéspedes de renta corta"
        descripcion="Solo las personas registradas aquí pueden ingresar al conjunto durante su estadía."
        accion={puedeRegistrar && <BotonLink href={ctx.ruta("/reservas/nueva")}>Registrar reserva</BotonLink>}
      />
      <div className="mb-4 flex gap-2 text-sm">
        <Link href={ctx.ruta("/reservas")} className={ver !== "historial" ? "font-semibold text-marca" : "text-tenue"}>Vigentes y próximas</Link>
        <span className="text-tenue">·</span>
        <Link href={ctx.ruta("/reservas?ver=historial")} className={ver === "historial" ? "font-semibold text-marca" : "text-tenue"}>Historial</Link>
      </div>
      {!reservas.length ? (
        <Vacio>No hay reservas{ver === "historial" ? " anteriores" : " vigentes"}.</Vacio>
      ) : (
        <Tabla>
          <thead><tr><th>Unidad</th><th>Llegada</th><th>Salida</th><th>Huéspedes</th><th>Plataforma</th><th>Estado</th></tr></thead>
          <tbody>
            {reservas.map((r) => (
              <tr key={r.id}>
                <td><Link href={ctx.ruta(`/reservas/${r.id}`)} className="font-medium hover:underline">{nombreUnidad(r.unidad)}</Link></td>
                <td>{fecha(r.check_in)}</td>
                <td>{fecha(r.check_out)}</td>
                <td>{r.huespedes[0]?.count ?? 0}</td>
                <td className="capitalize">{r.plataforma}{r.codigo_reserva && <span className="text-tenue"> · {r.codigo_reserva}</span>}</td>
                <td><Etiqueta tono={ESTADO_RESERVA[r.estado].tono}>{ESTADO_RESERVA[r.estado].texto}</Etiqueta></td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </>
  );
}
