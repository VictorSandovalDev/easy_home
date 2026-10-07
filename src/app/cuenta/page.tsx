import { Formulario } from "@/components/formulario";
import { Campo, Entrada, Selector, Tarjeta, Volver } from "@/components/ui";
import { usuarioActual } from "@/lib/contexto";
import { createClient } from "@/lib/supabase/server";
import { guardarPerfil } from "./actions";

export const metadata = { title: "Mi cuenta" };

export default async function Cuenta({ searchParams }: { searchParams: Promise<{ nueva?: string }> }) {
  const { nueva } = await searchParams;
  const user = await usuarioActual();
  const supabase = await createClient();
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", user.id).single();

  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <Volver href="/">Mis conjuntos</Volver>
      <h1 className="text-2xl font-semibold">Mi cuenta</h1>
      {nueva && (
        <p className="rounded-xl border border-marca/20 bg-marca/5 p-4 text-sm text-marca">
          Bienvenido. Completa tus datos y define una contraseña para ingresar.
        </p>
      )}
      <Tarjeta>
        <Formulario accion={guardarPerfil}>
          <Campo etiqueta="Correo"><Entrada value={user.email ?? ""} disabled /></Campo>
          <Campo etiqueta="Nombre completo"><Entrada name="nombre" defaultValue={perfil?.nombre ?? ""} required /></Campo>
          <Campo etiqueta="Celular"><Entrada name="telefono" defaultValue={perfil?.telefono ?? ""} /></Campo>
          <div className="grid grid-cols-3 gap-3">
            <Campo etiqueta="Tipo doc.">
              <Selector name="tipo_documento" defaultValue={perfil?.tipo_documento ?? "CC"}>
                <option>CC</option><option>CE</option><option>PP</option><option>NIT</option>
              </Selector>
            </Campo>
            <div className="col-span-2">
              <Campo etiqueta="Número"><Entrada name="numero_documento" defaultValue={perfil?.numero_documento ?? ""} /></Campo>
            </div>
          </div>
          <Campo etiqueta={nueva ? "Contraseña" : "Nueva contraseña"} ayuda="Mínimo 8 caracteres. Déjala vacía para no cambiarla.">
            <Entrada name="clave" type="password" autoComplete="new-password" required={!!nueva} />
          </Campo>
        </Formulario>
      </Tarjeta>
    </main>
  );
}
