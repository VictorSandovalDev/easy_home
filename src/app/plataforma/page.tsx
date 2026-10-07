import Link from "next/link";
import { redirect } from "next/navigation";
import { Formulario } from "@/components/formulario";
import { Campo, Entrada, Tabla, Tarjeta } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { crearConjunto } from "./actions";

export const metadata = { title: "Plataforma" };

export default async function Plataforma() {
  const supabase = await createClient();
  const { data: esPlataforma } = await supabase.rpc("es_admin_plataforma");
  if (!esPlataforma) redirect("/");
  const { data: conjuntos } = await supabase.from("conjuntos").select("id, slug, nombre, ciudad, dominio_personalizado, activo").order("creado_en", { ascending: false });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <Link href="/" className="text-sm text-tenue hover:underline">← Inicio</Link>
      <h1 className="text-2xl font-semibold">Plataforma · Conjuntos clientes</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Tabla>
          <thead><tr><th>Conjunto</th><th>Ciudad</th><th>Acceso</th></tr></thead>
          <tbody>
            {conjuntos?.map((c) => (
              <tr key={c.id}>
                <td><Link className="font-medium hover:underline" href={`/c/${c.slug}`}>{c.nombre}</Link></td>
                <td>{c.ciudad}</td>
                <td className="text-tenue">{c.dominio_personalizado ?? `/c/${c.slug}`}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
        <Tarjeta>
          <h2 className="mb-4 font-semibold">Nuevo conjunto</h2>
          <Formulario accion={crearConjunto} textoBoton="Crear conjunto">
            <Campo etiqueta="Nombre"><Entrada name="nombre" required /></Campo>
            <Campo etiqueta="Identificador" ayuda="Minúsculas, números y guiones. Ej: torres-del-parque">
              <Entrada name="slug" required pattern="[a-z0-9-]{3,40}" />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="NIT"><Entrada name="nit" /></Campo>
              <Campo etiqueta="Ciudad"><Entrada name="ciudad" /></Campo>
            </div>
            <Campo etiqueta="Color de marca"><Entrada name="color_primario" type="color" defaultValue="#0f766e" className="h-10 p-1" /></Campo>
            <hr className="border-borde" />
            <Campo etiqueta="Correo del administrador"><Entrada name="email_admin" type="email" /></Campo>
            <Campo etiqueta="Nombre del administrador"><Entrada name="nombre_admin" /></Campo>
          </Formulario>
        </Tarjeta>
      </div>
    </main>
  );
}
