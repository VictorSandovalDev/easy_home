import Link from "next/link";
import { Formulario } from "@/components/formulario";
import { AreaTexto, Campo, Encabezado, Etiqueta, Selector, Tabla, Tarjeta, Vacio } from "@/components/ui";
import { exigir } from "@/lib/contexto";
import { nombrePerfil, perfilesPorId } from "@/lib/perfiles";
import { nombreUnidad, pesos } from "@/lib/tipos";
import { crearUnidades } from "./actions";

export const metadata = { title: "Unidades" };

export default async function Unidades({ params }: { params: Promise<{ conjunto: string }> }) {
  const { conjunto } = await params;
  const ctx = await exigir(conjunto, "administracion", "consejo");
  const { data } = await ctx.supabase
    .from("unidades")
    .select("*, personas:unidad_personas(usuario_id, relacion)")
    .eq("conjunto_id", ctx.conjunto.id);
  const unidades = (data ?? []).sort((a, b) => nombreUnidad(a).localeCompare(nombreUnidad(b), "es", { numeric: true }));
  const perfiles = await perfilesPorId(ctx.supabase, unidades.flatMap((u) => u.personas.map((p: { usuario_id: string }) => p.usuario_id)));
  const totalCoef = unidades.reduce((s, u) => s + Number(u.coeficiente), 0);

  return (
    <>
      <Encabezado
        titulo="Unidades"
        descripcion={`${unidades.length} unidades · coeficiente total ${totalCoef.toFixed(3)}%${Math.abs(totalCoef - 100) > 0.01 && unidades.length ? " (debería sumar 100%)" : ""}`}
      />
      <div className={ctx.esAdministracion ? "grid gap-6 lg:grid-cols-[1fr_320px]" : ""}>
        {!unidades.length ? (
          <Vacio>No hay unidades registradas.</Vacio>
        ) : (
          <Tabla>
            <thead><tr><th>Unidad</th><th>Propietario</th><th>Coef.</th><th>Cuota</th><th /></tr></thead>
            <tbody>
              {unidades.map((u) => {
                const prop = u.personas.find((p: { relacion: string }) => p.relacion === "propietario");
                return (
                  <tr key={u.id}>
                    <td><Link href={ctx.ruta(`/unidades/${u.id}`)} className="font-medium hover:underline">{nombreUnidad(u)}</Link></td>
                    <td>{prop ? nombrePerfil(perfiles.get(prop.usuario_id)) : <span className="text-tenue">Sin asignar</span>}</td>
                    <td>{Number(u.coeficiente).toFixed(3)}</td>
                    <td>{pesos(u.cuota_administracion)}</td>
                    <td>{u.permite_renta_corta && <Etiqueta tono="marca">Renta corta</Etiqueta>}</td>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
        )}
        {ctx.esAdministracion && (
          <Tarjeta className="h-fit">
            <h2 className="mb-1 font-semibold">Agregar unidades</h2>
            <p className="mb-3 text-xs text-tenue">Una por línea: <code>torre;número;coeficiente;cuota</code>. Puedes pegar desde Excel.</p>
            <Formulario accion={crearUnidades.bind(null, conjunto)} textoBoton="Guardar unidades">
              <Campo etiqueta="Tipo">
                <Selector name="tipo"><option value="apartamento">Apartamento</option><option value="casa">Casa</option><option value="local">Local</option></Selector>
              </Campo>
              <AreaTexto name="lineas" rows={8} placeholder={"Torre 1;101;0.85;320000\nTorre 1;102;0.85;320000\n;Casa 7;1.2;450000"} />
            </Formulario>
          </Tarjeta>
        )}
      </div>
    </>
  );
}
