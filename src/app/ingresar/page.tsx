import { headers } from "next/headers";
import { Formulario } from "@/components/formulario";
import { Campo, Entrada } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ingresar } from "./actions";

export const metadata = { title: "Ingresar" };

export default async function Ingresar({ searchParams }: { searchParams: Promise<{ conjunto?: string }> }) {
  const { conjunto: slug } = await searchParams;
  const host = ((await headers()).get("host") ?? "").split(":")[0];
  const supabase = await createClient();
  const { data } = await supabase.rpc("marca_conjunto", slug ? { p_slug: slug } : { p_dominio: host });
  const marca = data?.[0] as { slug: string; nombre: string; logo_url: string | null; color_primario: string } | undefined;

  return (
    <main
      className="flex min-h-dvh items-center justify-center p-4"
      style={marca ? ({ "--marca": marca.color_primario } as React.CSSProperties) : undefined}
    >
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-borde bg-superficie p-8">
        <div className="space-y-2 text-center">
          {marca?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={marca.logo_url} alt={marca.nombre} className="mx-auto h-14 object-contain" />
          ) : (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-marca text-lg font-bold text-white">
              {(marca?.nombre ?? "E")[0]}
            </div>
          )}
          <h1 className="text-xl font-semibold">{marca?.nombre ?? "Easy Home"}</h1>
          <p className="text-sm text-tenue">Ingresa con el correo con el que te invitaron.</p>
        </div>
        <Formulario accion={ingresar} textoBoton="Ingresar" className="space-y-4 [&>button]:w-full">
          <input type="hidden" name="destino" value={marca ? `/c/${marca.slug}` : "/"} />
          <Campo etiqueta="Correo">
            <Entrada name="email" type="email" required autoComplete="email" />
          </Campo>
          <Campo etiqueta="Contraseña" ayuda="Déjala vacía para recibir un enlace de acceso por correo.">
            <Entrada name="clave" type="password" autoComplete="current-password" />
          </Campo>
        </Formulario>
      </div>
    </main>
  );
}
