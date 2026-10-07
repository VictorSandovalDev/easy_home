import { Formulario } from "@/components/formulario";
import { Campo, Encabezado, Entrada, Etiqueta, Selector, Tabla, Tarjeta } from "@/components/ui";
import { exigir } from "@/lib/contexto";
import { nombrePerfil, perfilesPorId } from "@/lib/perfiles";
import { NOMBRE_ROL, type Rol } from "@/lib/tipos";
import { invitarMiembro, quitarMembresia } from "./actions";

export const metadata = { title: "Personas" };

export default async function Personas({ params }: { params: Promise<{ conjunto: string }> }) {
  const { conjunto } = await params;
  const ctx = await exigir(conjunto, "administracion");
  const { data } = await ctx.supabase.from("membresias").select("id, usuario_id, rol").eq("conjunto_id", ctx.conjunto.id);
  const perfiles = await perfilesPorId(ctx.supabase, (data ?? []).map((m) => m.usuario_id));

  const porUsuario = new Map<string, { id: string; rol: Rol }[]>();
  for (const m of data ?? []) porUsuario.set(m.usuario_id, [...(porUsuario.get(m.usuario_id) ?? []), { id: m.id, rol: m.rol as Rol }]);
  const filas = [...porUsuario.entries()].sort((a, b) => nombrePerfil(perfiles.get(a[0])).localeCompare(nombrePerfil(perfiles.get(b[0]))));

  return (
    <>
      <Encabezado titulo="Personas" descripcion="Propietarios, administradores de propiedad y arrendatarios se asignan desde cada unidad." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Tabla>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Roles</th></tr></thead>
          <tbody>
            {filas.map(([uid, membresias]) => (
              <tr key={uid}>
                <td className="font-medium">{nombrePerfil(perfiles.get(uid))}</td>
                <td className="text-tenue">{perfiles.get(uid)?.email}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {membresias.map((m) => (
                      <span key={m.id} className="inline-flex items-center gap-1">
                        <Etiqueta tono={["administracion", "consejo"].includes(m.rol) ? "marca" : "gris"}>{NOMBRE_ROL[m.rol]}</Etiqueta>
                        {["administracion", "consejo", "porteria"].includes(m.rol) && uid !== ctx.user.id && (
                          <form action={quitarMembresia.bind(null, conjunto, m.id)}>
                            <button className="text-xs text-tenue hover:text-red-600" title="Quitar rol">✕</button>
                          </form>
                        )}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
        <Tarjeta className="h-fit">
          <h2 className="mb-3 font-semibold">Invitar</h2>
          <Formulario accion={invitarMiembro.bind(null, conjunto)} textoBoton="Invitar">
            <Campo etiqueta="Rol">
              <Selector name="rol">
                <option value="consejo">Consejo de administración</option>
                <option value="administracion">Administrador del conjunto</option>
                <option value="porteria">Portería / vigilancia</option>
              </Selector>
            </Campo>
            <Campo etiqueta="Correo"><Entrada name="email" type="email" required /></Campo>
            <Campo etiqueta="Nombre"><Entrada name="nombre" /></Campo>
          </Formulario>
        </Tarjeta>
      </div>
    </>
  );
}
