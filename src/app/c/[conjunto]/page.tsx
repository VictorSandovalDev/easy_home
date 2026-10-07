import Link from "next/link";
import { ArrowRight, Building2, Gavel, Luggage, Megaphone, Vote } from "lucide-react";
import { BotonLink, Etiqueta, Indicador, Tarjeta, TituloSeccion } from "@/components/ui";
import { contextoConjunto } from "@/lib/contexto";
import { fecha, hoyColombia, NOMBRE_RELACION, nombreUnidad } from "@/lib/tipos";

export default async function Tablero({ params }: { params: Promise<{ conjunto: string }> }) {
  const ctx = await contextoConjunto((await params).conjunto);
  const { supabase, conjunto, user } = ctx;
  const hoy = hoyColombia();
  const ahora = new Date().toISOString();

  let qSanciones = supabase
    .from("sanciones")
    .select("id", { count: "exact", head: true })
    .eq("conjunto_id", conjunto.id)
    .in("estado", ["notificada", "en_descargos"]);
  if (!ctx.esGestor) qSanciones = qSanciones.eq("destinatario_id", user.id);

  const [{ data: perfil }, { data: comunicados }, { data: lecturas }, { data: votaciones }, { count: sancionesPendientes }, { data: reservasHoy }, { count: totalUnidades }] =
    await Promise.all([
      supabase.from("perfiles").select("nombre").eq("id", user.id).maybeSingle(),
      supabase.from("comunicados").select("id, titulo, cuerpo, emisor, creado_en").eq("conjunto_id", conjunto.id).order("creado_en", { ascending: false }).limit(4),
      supabase.from("comunicado_lecturas").select("comunicado_id").eq("usuario_id", user.id),
      supabase.from("votaciones").select("id, titulo, cierra_en").eq("conjunto_id", conjunto.id).lte("abre_en", ahora).gte("cierra_en", ahora).order("cierra_en"),
      qSanciones,
      supabase.from("reservas").select("id, check_out, unidad:unidades(torre, numero), huespedes(count)").eq("conjunto_id", conjunto.id).in("estado", ["programada", "en_curso"]).lte("check_in", hoy).gte("check_out", hoy),
      supabase.from("unidades").select("id", { count: "exact", head: true }).eq("conjunto_id", conjunto.id),
    ]);

  const leidos = new Set((lecturas ?? []).map((l) => l.comunicado_id));
  const sinLeer = (comunicados ?? []).filter((c) => !leidos.has(c.id)).length;
  const reservas = (reservasHoy ?? []) as unknown as { id: string; check_out: string; unidad: { torre: string | null; numero: string }; huespedes: { count: number }[] }[];
  const huespedesHoy = reservas.reduce((s, r) => s + (r.huespedes[0]?.count ?? 0), 0);
  const primerNombre = (perfil?.nombre || "").split(" ")[0];
  const fechaLarga = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Bogota" }).format(new Date());

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-marca via-marca to-blue-800 px-6 py-8 text-white shadow-xl shadow-marca/20 sm:px-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-sky-300/20 blur-3xl" />
        <p className="relative text-sm font-medium capitalize text-blue-100">{fechaLarga}</p>
        <h1 className="relative mt-1 text-3xl font-semibold tracking-tight">{primerNombre ? `Hola, ${primerNombre}` : "Bienvenido"}</h1>
        <p className="relative mt-2 max-w-xl text-blue-100">
          Esto es lo que está pasando hoy en {conjunto.nombre}.
        </p>
        <div className="relative mt-6 flex flex-wrap gap-2">
          {ctx.esGestor && (
            <BotonLink href={ctx.ruta("/comunicados/nuevo")} className="bg-white text-marca shadow-none hover:bg-blue-50 hover:brightness-100">
              <Megaphone className="h-4 w-4" /> Publicar comunicado
            </BotonLink>
          )}
          {ctx.misUnidades.some((u) => u.relacion !== "arrendatario" && u.unidad.permite_renta_corta) && (
            <BotonLink href={ctx.ruta("/reservas/nueva")} className="bg-white/15 text-white shadow-none ring-1 ring-white/30 hover:bg-white/25 hover:brightness-100">
              <Luggage className="h-4 w-4" /> Registrar huéspedes
            </BotonLink>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Comunicados sin leer" valor={sinLeer} detalle="de los últimos publicados" icono={Megaphone} href={ctx.ruta("/comunicados")} />
        <Indicador titulo="Votaciones abiertas" valor={votaciones?.length ?? 0} detalle="esperando participación" icono={Vote} tono="verde" href={ctx.ruta("/votaciones")} />
        <Indicador
          titulo={ctx.esGestor ? "Procesos sancionatorios" : "Mis notificaciones"}
          valor={sancionesPendientes ?? 0}
          detalle="pendientes de decisión"
          icono={Gavel}
          tono="ambar"
          href={ctx.ruta("/sanciones")}
        />
        {conjunto.permite_renta_corta ? (
          <Indicador titulo="Huéspedes hoy" valor={huespedesHoy} detalle={`en ${reservas.length} reserva${reservas.length === 1 ? "" : "s"} activas`} icono={Luggage} tono="rojo" href={ctx.ruta(ctx.tiene("porteria", "administracion") ? "/porteria" : "/reservas")} />
        ) : (
          <Indicador titulo="Unidades" valor={totalUnidades ?? 0} icono={Building2} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Tarjeta className="lg:col-span-3">
          <TituloSeccion
            accion={
              <Link href={ctx.ruta("/comunicados")} className="inline-flex items-center gap-1 text-sm font-medium text-marca hover:underline">
                Ver todos <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            Comunicados recientes
          </TituloSeccion>
          {!comunicados?.length && <p className="text-sm text-tenue">Sin comunicados aún.</p>}
          <ul className="-mx-2 space-y-1">
            {comunicados?.map((c) => (
              <li key={c.id}>
                <Link href={ctx.ruta(`/comunicados/${c.id}`)} className="flex gap-4 rounded-xl p-3 transition hover:bg-slate-50">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${leidos.has(c.id) ? "bg-transparent" : "bg-marca"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`truncate ${leidos.has(c.id) ? "font-medium" : "font-semibold"}`}>{c.titulo}</p>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-sm text-tenue">{c.cuerpo}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {c.emisor === "consejo" ? "Consejo de administración" : "Administración"} · {fecha(c.creado_en)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <div className="space-y-6 lg:col-span-2">
          <Tarjeta>
            <TituloSeccion>Votaciones abiertas</TituloSeccion>
            {!votaciones?.length && <p className="text-sm text-tenue">No hay votaciones en curso.</p>}
            <ul className="space-y-3">
              {votaciones?.map((v) => (
                <li key={v.id}>
                  <Link href={ctx.ruta(`/votaciones/${v.id}`)} className="block rounded-xl border border-borde p-4 transition hover:border-marca/40 hover:bg-marca/5">
                    <p className="font-medium leading-snug">{v.titulo}</p>
                    <p className="mt-2 text-xs text-tenue">Cierra el {fecha(v.cierra_en, true)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Tarjeta>

          <Tarjeta>
            <TituloSeccion>Mis unidades</TituloSeccion>
            {!ctx.misUnidades.length && <p className="text-sm text-tenue">No tienes unidades asignadas.</p>}
            <ul className="divide-y divide-borde">
              {ctx.misUnidades.map((u) => (
                <li key={u.unidad.id + u.relacion} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{nombreUnidad(u.unidad)}</p>
                    <p className="text-xs text-tenue">{NOMBRE_RELACION[u.relacion]} · coef. {Number(u.unidad.coeficiente).toFixed(2)}%</p>
                  </div>
                  {u.unidad.permite_renta_corta && <Etiqueta tono="marca">Renta corta</Etiqueta>}
                </li>
              ))}
            </ul>
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}
