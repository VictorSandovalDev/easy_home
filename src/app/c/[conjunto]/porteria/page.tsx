import { Boton, Encabezado, Entrada, Etiqueta, Tarjeta, Vacio } from "@/components/ui";
import { exigir } from "@/lib/contexto";
import { fecha, nombreUnidad, hoyColombia } from "@/lib/tipos";
import { registrarAcceso } from "./actions";

export const metadata = { title: "Portería" };
export const dynamic = "force-dynamic";

type Huesped = {
  id: string; nombre: string; tipo_documento: string; numero_documento: string; es_menor: boolean;
  placa_vehiculo: string | null; accesos: { tipo: "ingreso" | "salida"; registrado_en: string }[];
};

export default async function Porteria({
  params,
  searchParams,
}: {
  params: Promise<{ conjunto: string }>;
  searchParams: Promise<{ doc?: string }>;
}) {
  const { conjunto } = await params;
  const { doc } = await searchParams;
  const ctx = await exigir(conjunto, "porteria", "administracion");
  const hoy = hoyColombia();

  const [{ data: busqueda }, { data }] = await Promise.all([
    doc ? ctx.supabase.rpc("buscar_huesped_autorizado", { p_conjunto: ctx.conjunto.id, p_documento: doc }) : Promise.resolve({ data: null }),
    ctx.supabase
      .from("reservas")
      .select("id, check_in, check_out, notas, unidad:unidades(torre, numero), huespedes(id, nombre, tipo_documento, numero_documento, es_menor, placa_vehiculo, accesos(tipo, registrado_en))")
      .eq("conjunto_id", ctx.conjunto.id)
      .in("estado", ["programada", "en_curso"])
      .lte("check_in", hoy)
      .gte("check_out", hoy)
      .order("check_in"),
  ]);
  const reservas = (data ?? []) as unknown as {
    id: string; check_in: string; check_out: string; notas: string | null;
    unidad: { torre: string | null; numero: string }; huespedes: Huesped[];
  }[];
  const resultados = (busqueda ?? []) as { huesped_id: string; nombre: string; unidad: string; check_out: string }[];

  return (
    <>
      <Encabezado titulo="Portería" descripcion={`Huéspedes autorizados para hoy, ${fecha(hoy)}.`} />

      <Tarjeta className="mb-6">
        <form className="flex gap-2">
          <Entrada name="doc" defaultValue={doc} placeholder="Número de documento del visitante" inputMode="numeric" autoFocus className="text-lg" />
          <Boton type="submit">Verificar</Boton>
        </form>
        {doc && (
          resultados.length ? (
            <div className="mt-4 rounded-lg bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-300">
              <p className="text-lg font-semibold">✓ AUTORIZADO</p>
              {resultados.map((r) => (
                <p key={r.huesped_id}>{r.nombre} · Unidad {r.unidad} · hasta {fecha(r.check_out)}</p>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg bg-red-500/10 p-4 text-red-800 dark:text-red-300">
              <p className="text-lg font-semibold">✕ NO AUTORIZADO</p>
              <p>El documento {doc} no tiene una reserva vigente hoy. Comunícate con el propietario o la administración.</p>
            </div>
          )
        )}
      </Tarjeta>

      {!reservas.length && <Vacio>No hay huéspedes de renta corta autorizados hoy.</Vacio>}
      <div className="space-y-4">
        {reservas.map((r) => (
          <Tarjeta key={r.id}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">Unidad {nombreUnidad(r.unidad)}</h2>
              <span className="text-sm text-tenue">{fecha(r.check_in)} → {fecha(r.check_out)}</span>
              {r.check_out === hoy && <Etiqueta tono="ambar">Sale hoy</Etiqueta>}
            </div>
            {r.notas && <p className="mb-3 rounded-lg bg-fondo p-2 text-sm">{r.notas}</p>}
            <ul className="divide-y divide-borde">
              {r.huespedes.map((h) => {
                const ultimo = [...h.accesos].sort((a, b) => b.registrado_en.localeCompare(a.registrado_en))[0];
                const adentro = ultimo?.tipo === "ingreso";
                return (
                  <li key={h.id} className="flex flex-wrap items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{h.nombre} {h.es_menor && <Etiqueta>Menor</Etiqueta>}</p>
                      <p className="text-sm text-tenue">
                        {h.tipo_documento} {h.numero_documento}{h.placa_vehiculo && ` · 🚗 ${h.placa_vehiculo}`}
                        {ultimo && ` · ${adentro ? "Adentro desde" : "Salió"} ${fecha(ultimo.registrado_en, true)}`}
                      </p>
                    </div>
                    <form action={registrarAcceso.bind(null, conjunto, h.id, r.id, adentro ? "salida" : "ingreso")}>
                      <Boton variante={adentro ? "secundario" : "primario"}>{adentro ? "Registrar salida" : "Registrar ingreso"}</Boton>
                    </form>
                  </li>
                );
              })}
            </ul>
          </Tarjeta>
        ))}
      </div>
    </>
  );
}
