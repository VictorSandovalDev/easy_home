import Link from "next/link";
import { notFound } from "next/navigation";
import { Formulario } from "@/components/formulario";
import { Campo, Entrada, Selector, Tabla, Tarjeta } from "@/components/ui";
import { exigir } from "@/lib/contexto";
import { nombrePerfil, perfilesPorId } from "@/lib/perfiles";
import { fecha, NOMBRE_RELACION, nombreUnidad, type Relacion } from "@/lib/tipos";
import { actualizarUnidad, asignarPersona, retirarPersona } from "../actions";

export default async function Unidad({ params }: { params: Promise<{ conjunto: string; id: string }> }) {
  const { conjunto, id } = await params;
  const ctx = await exigir(conjunto, "administracion", "consejo");
  const { data: u } = await ctx.supabase
    .from("unidades")
    .select("*, personas:unidad_personas(id, usuario_id, relacion, desde, hasta)")
    .eq("id", id)
    .eq("conjunto_id", ctx.conjunto.id)
    .maybeSingle();
  if (!u) notFound();
  const personas = u.personas as { id: string; usuario_id: string; relacion: Relacion; desde: string; hasta: string | null }[];
  const perfiles = await perfilesPorId(ctx.supabase, personas.map((p) => p.usuario_id));

  return (
    <div className="space-y-4">
      <Link href={ctx.ruta("/unidades")} className="text-sm text-tenue hover:underline">← Unidades</Link>
      <h1 className="text-2xl font-semibold">Unidad {nombreUnidad(u)}</h1>

      <Tabla>
        <thead><tr><th>Persona</th><th>Relación</th><th>Contacto</th><th>Vigencia</th>{ctx.esAdministracion && <th />}</tr></thead>
        <tbody>
          {!personas.length && <tr><td colSpan={5} className="text-tenue">Sin personas asignadas.</td></tr>}
          {personas.map((p) => {
            const perfil = perfiles.get(p.usuario_id);
            return (
              <tr key={p.id}>
                <td className="font-medium">{nombrePerfil(perfil)}</td>
                <td>{NOMBRE_RELACION[p.relacion]}</td>
                <td className="text-tenue">{perfil?.email}{perfil?.telefono && ` · ${perfil.telefono}`}</td>
                <td className="text-tenue">desde {fecha(p.desde)}{p.hasta && ` hasta ${fecha(p.hasta)}`}</td>
                {ctx.esAdministracion && (
                  <td>
                    <form action={retirarPersona.bind(null, conjunto, id, p.id)}>
                      <button className="text-sm text-red-600 hover:underline">Retirar</button>
                    </form>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </Tabla>

      {ctx.esAdministracion && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Tarjeta>
            <h2 className="mb-3 font-semibold">Asignar persona</h2>
            <Formulario accion={asignarPersona.bind(null, conjunto, id)} textoBoton="Asignar e invitar">
              <Campo etiqueta="Relación con la unidad">
                <Selector name="relacion">
                  {Object.entries(NOMBRE_RELACION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Selector>
              </Campo>
              <Campo etiqueta="Correo"><Entrada name="email" type="email" required /></Campo>
              <Campo etiqueta="Nombre"><Entrada name="nombre" /></Campo>
              <Campo etiqueta="Hasta (opcional)" ayuda="Para arrendatarios, fecha fin del contrato."><Entrada name="hasta" type="date" /></Campo>
            </Formulario>
          </Tarjeta>
          <Tarjeta>
            <h2 className="mb-3 font-semibold">Datos de la unidad</h2>
            <Formulario accion={actualizarUnidad.bind(null, conjunto, id)}>
              <Campo etiqueta="Tipo">
                <Selector name="tipo" defaultValue={u.tipo}>
                  <option value="apartamento">Apartamento</option><option value="casa">Casa</option><option value="local">Local</option><option value="otro">Otro</option>
                </Selector>
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Coeficiente (%)"><Entrada name="coeficiente" type="number" step="0.00001" defaultValue={u.coeficiente} /></Campo>
                <Campo etiqueta="Cuota mensual (COP)"><Entrada name="cuota_administracion" type="number" step="1" defaultValue={u.cuota_administracion} /></Campo>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="permite_renta_corta" defaultChecked={u.permite_renta_corta} className="accent-marca" />
                Habilitada para renta corta (Airbnb)
              </label>
            </Formulario>
          </Tarjeta>
        </div>
      )}
    </div>
  );
}
