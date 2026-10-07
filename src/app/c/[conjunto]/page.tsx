import Link from "next/link";
import { Encabezado, Etiqueta, Tarjeta } from "@/components/ui";
import { contextoConjunto } from "@/lib/contexto";
import { fecha, nombreUnidad, NOMBRE_RELACION, hoyColombia } from "@/lib/tipos";

export default async function Tablero({ params }: { params: Promise<{ conjunto: string }> }) {
  const ctx = await contextoConjunto((await params).conjunto);
  const { supabase, conjunto, user } = ctx;
  const hoy = hoyColombia();
  const ahora = new Date().toISOString();

  const [{ data: comunicados }, { data: lecturas }, { data: votaciones }, { data: sanciones }, { data: reservas }] =
    await Promise.all([
      supabase.from("comunicados").select("id, titulo, emisor, creado_en").eq("conjunto_id", conjunto.id).order("creado_en", { ascending: false }).limit(5),
      supabase.from("comunicado_lecturas").select("comunicado_id").eq("usuario_id", user.id),
      supabase.from("votaciones").select("id, titulo, cierra_en").eq("conjunto_id", conjunto.id).lte("abre_en", ahora).gte("cierra_en", ahora).order("cierra_en"),
      supabase.from("sanciones").select("id, tipo, estado, plazo_descargos").eq("conjunto_id", conjunto.id).eq("destinatario_id", user.id).in("estado", ["notificada", "en_descargos", "confirmada"]),
      supabase.from("reservas").select("id").eq("conjunto_id", conjunto.id).in("estado", ["programada", "en_curso"]).lte("check_in", hoy).gte("check_out", hoy),
    ]);

  const leidos = new Set((lecturas ?? []).map((l) => l.comunicado_id));
  const sinLeer = (comunicados ?? []).filter((c) => !leidos.has(c.id));

  return (
    <>
      <Encabezado titulo={`Hola${user.user_metadata?.nombre ? `, ${String(user.user_metadata.nombre).split(" ")[0]}` : ""}`} descripcion={conjunto.nombre} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador titulo="Comunicados sin leer" valor={sinLeer.length} href={ctx.ruta("/comunicados")} />
        <Indicador titulo="Votaciones abiertas" valor={votaciones?.length ?? 0} href={ctx.ruta("/votaciones")} />
        <Indicador titulo="Mis notificaciones pendientes" valor={sanciones?.length ?? 0} href={ctx.ruta("/sanciones")} />
        {(reservas?.length ?? 0) > 0 && <Indicador titulo="Reservas activas hoy" valor={reservas!.length} href={ctx.ruta("/reservas")} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta>
          <h2 className="mb-3 font-semibold">Últimos comunicados</h2>
          {!comunicados?.length && <p className="text-sm text-tenue">Sin comunicados aún.</p>}
          <ul className="divide-y divide-borde">
            {comunicados?.map((c) => (
              <li key={c.id} className="py-2">
                <Link href={ctx.ruta(`/comunicados/${c.id}`)} className="flex items-center justify-between gap-2 hover:underline">
                  <span className={leidos.has(c.id) ? "" : "font-semibold"}>{c.titulo}</span>
                  <span className="shrink-0 text-xs text-tenue">{fecha(c.creado_en)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta>
          <h2 className="mb-3 font-semibold">Mis unidades</h2>
          {!ctx.misUnidades.length && <p className="text-sm text-tenue">No tienes unidades asignadas.</p>}
          <ul className="space-y-2">
            {ctx.misUnidades.map((u) => (
              <li key={u.unidad.id + u.relacion} className="flex items-center justify-between">
                <span>{nombreUnidad(u.unidad)}</span>
                <span className="flex gap-2">
                  {u.unidad.permite_renta_corta && <Etiqueta tono="marca">Renta corta</Etiqueta>}
                  <Etiqueta>{NOMBRE_RELACION[u.relacion]}</Etiqueta>
                </span>
              </li>
            ))}
          </ul>
          {votaciones?.length ? (
            <>
              <h2 className="mb-3 mt-6 font-semibold">Votaciones abiertas</h2>
              <ul className="space-y-2">
                {votaciones.map((v) => (
                  <li key={v.id}>
                    <Link href={ctx.ruta(`/votaciones/${v.id}`)} className="hover:underline">{v.titulo}</Link>
                    <span className="ml-2 text-xs text-tenue">cierra {fecha(v.cierra_en, true)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Tarjeta>
      </div>
    </>
  );
}

function Indicador({ titulo, valor, href }: { titulo: string; valor: number; href: string }) {
  return (
    <Link href={href}>
      <Tarjeta className="hover:border-marca">
        <p className="text-sm text-tenue">{titulo}</p>
        <p className="mt-1 text-3xl font-semibold">{valor}</p>
      </Tarjeta>
    </Link>
  );
}
