import { headers } from "next/headers";
import { Luggage, Megaphone, ShieldCheck, Vote } from "lucide-react";
import { Formulario } from "@/components/formulario";
import { Campo, Entrada } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ingresar } from "./actions";

export const metadata = { title: "Ingresar" };

const BENEFICIOS = [
  { icono: Megaphone, titulo: "Comunicación oficial", texto: "Comunicados del consejo y la administración con confirmación de lectura." },
  { icono: Vote, titulo: "Votaciones por coeficiente", texto: "Consultas a propietarios con resultados en tiempo real." },
  { icono: Luggage, titulo: "Control de huéspedes", texto: "Registro previo de visitantes de Airbnb para portería." },
  { icono: ShieldCheck, titulo: "Convivencia con debido proceso", texto: "Llamados de atención y multas basados en el RPH." },
];

export default async function Ingresar({ searchParams }: { searchParams: Promise<{ conjunto?: string }> }) {
  const { conjunto: slug } = await searchParams;
  const host = ((await headers()).get("host") ?? "").split(":")[0];
  const supabase = await createClient();
  const { data } = await supabase.rpc("marca_conjunto", slug ? { p_slug: slug } : { p_dominio: host });
  const marca = data?.[0] as { slug: string; nombre: string; logo_url: string | null; color_primario: string } | undefined;
  const nombre = marca?.nombre ?? "Easy Home";

  return (
    <main
      className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]"
      style={marca ? ({ "--marca": marca.color_primario } as React.CSSProperties) : undefined}
    >
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-marca via-blue-700 to-blue-900 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-lg font-bold ring-1 ring-white/30">{nombre[0]}</span>
          <span className="text-lg font-semibold">{nombre}</span>
        </div>
        <div className="relative mt-auto max-w-lg">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">Tu conjunto, conectado y en orden.</h2>
          <p className="mt-4 text-lg text-blue-100">Consejo, administración, propietarios y portería en un solo lugar.</p>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2">
            {BENEFICIOS.map(({ icono: Icono, titulo, texto }) => (
              <li key={titulo} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                <Icono className="h-5 w-5 text-sky-200" />
                <p className="mt-3 font-medium">{titulo}</p>
                <p className="mt-1 text-sm text-blue-100">{texto}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-10 text-xs text-blue-200">© {new Date().getFullYear()} Easy Home · Propiedad horizontal</p>
      </section>

      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          {marca?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={marca.logo_url} alt={nombre} className="mb-8 h-12 object-contain" />
          ) : (
            <span className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-marca to-blue-700 text-xl font-bold text-white shadow-lg shadow-marca/30 lg:hidden">
              {nombre[0]}
            </span>
          )}
          <h1 className="text-3xl font-semibold tracking-tight">Bienvenido</h1>
          <p className="mt-2 text-sm text-tenue">Ingresa a {nombre} con el correo con el que te registraron.</p>
          <div className="mt-8">
            <Formulario accion={ingresar} textoBoton="Ingresar" className="space-y-5 [&>button]:h-11 [&>button]:w-full">
              <input type="hidden" name="destino" value={marca ? `/c/${marca.slug}` : "/"} />
              <Campo etiqueta="Correo electrónico">
                <Entrada name="email" type="email" required autoComplete="email" placeholder="nombre@correo.com" />
              </Campo>
              <Campo etiqueta="Contraseña" ayuda="¿Sin contraseña? Déjala vacía y te enviaremos un enlace de acceso.">
                <Entrada name="clave" type="password" autoComplete="current-password" placeholder="••••••••" />
              </Campo>
            </Formulario>
          </div>
        </div>
      </section>
    </main>
  );
}
