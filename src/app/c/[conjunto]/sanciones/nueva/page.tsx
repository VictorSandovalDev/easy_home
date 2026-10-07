import { Gavel } from "lucide-react";
import { Formulario } from "@/components/formulario";
import { AreaTexto, Campo, Encabezado, Entrada, Selector, Tarjeta, Vacio } from "@/components/ui";
import { exigir } from "@/lib/contexto";
import { nombrePerfil, perfilesPorId } from "@/lib/perfiles";
import { NOMBRE_RELACION, nombreUnidad, pesos, type Relacion, hoyColombia } from "@/lib/tipos";
import { crearSancion } from "../actions";

export const metadata = { title: "Nueva notificación" };

export default async function NuevaSancion({ params }: { params: Promise<{ conjunto: string }> }) {
  const { conjunto } = await params;
  const ctx = await exigir(conjunto, "administracion");

  const [{ data: personas }, { data: articulos }] = await Promise.all([
    ctx.supabase
      .from("unidad_personas")
      .select("usuario_id, relacion, unidad:unidades!inner(id, torre, numero, cuota_administracion, conjunto_id)")
      .eq("unidad.conjunto_id", ctx.conjunto.id)
      .in("relacion", ["propietario", "administrador_propiedad"]),
    ctx.supabase.from("rph_articulos").select("id, numero, titulo, sancionable").eq("conjunto_id", ctx.conjunto.id),
  ]);
  const filas = (personas ?? []) as unknown as {
    usuario_id: string; relacion: Relacion;
    unidad: { id: string; torre: string | null; numero: string; cuota_administracion: number };
  }[];
  filas.sort((a, b) => nombreUnidad(a.unidad).localeCompare(nombreUnidad(b.unidad), "es", { numeric: true }));
  const perfiles = await perfilesPorId(ctx.supabase, filas.map((f) => f.usuario_id));
  const arts = (articulos ?? []).sort((a, b) => Number(b.sancionable) - Number(a.sancionable) || a.numero.localeCompare(b.numero, "es", { numeric: true }));

  if (!filas.length) return <Vacio icono={Gavel}>Primero asigna propietarios o administradores de propiedad a las unidades.</Vacio>;

  return (
    <>
      <Encabezado titulo="Nueva notificación" descripcion={`El destinatario tendrá ${ctx.conjunto.dias_descargos} días para presentar descargos.`} />
      <Tarjeta className="max-w-2xl">
        <Formulario accion={crearSancion.bind(null, conjunto)} textoBoton="Notificar">
          <Campo etiqueta="Unidad y destinatario">
            <Selector name="destino" required>
              {filas.map((f) => (
                <option key={f.unidad.id + f.usuario_id} value={`${f.unidad.id}|${f.usuario_id}`}>
                  {nombreUnidad(f.unidad)} · {nombrePerfil(perfiles.get(f.usuario_id))} ({NOMBRE_RELACION[f.relacion]})
                  {f.unidad.cuota_administracion > 0 ? ` · tope multa ${pesos(f.unidad.cuota_administracion * 2)}` : ""}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Artículo del RPH incumplido">
            <Selector name="articulo_id">
              <option value="">— Seleccionar —</option>
              {arts.map((a) => <option key={a.id} value={a.id}>Art. {a.numero} · {a.titulo}{a.sancionable ? " ⚠" : ""}</option>)}
            </Selector>
          </Campo>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="Tipo">
              <Selector name="tipo"><option value="llamado_atencion">Llamado de atención</option><option value="multa">Multa</option></Selector>
            </Campo>
            <Campo etiqueta="Valor (COP)" ayuda="Solo para multas"><Entrada name="valor" type="number" min={0} step={1000} /></Campo>
            <Campo etiqueta="Fecha de los hechos"><Entrada name="fecha_hechos" type="date" required defaultValue={hoyColombia()} /></Campo>
          </div>
          <Campo etiqueta="Descripción de los hechos" ayuda="Sé específico: qué ocurrió, cuándo, dónde y qué pruebas existen.">
            <AreaTexto name="hechos" required rows={6} />
          </Campo>
        </Formulario>
      </Tarjeta>
    </>
  );
}
