import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Hosts propios de la plataforma; cualquier otro host se trata como dominio de marca blanca.
const HOSTS_PLATAFORMA = (process.env.HOSTS_PLATAFORMA ?? "localhost")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const RUTAS_SIN_REESCRITURA = ["/c/", "/auth", "/ingresar", "/cuenta", "/plataforma", "/_next", "/api"];
const RUTAS_PUBLICAS = ["/ingresar", "/auth"];

const cacheDominios = new Map<string, { slug: string | null; expira: number }>();

async function slugPorDominio(host: string): Promise<string | null> {
  const cached = cacheDominios.get(host);
  if (cached && cached.expira > Date.now()) return cached.slug;
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/marca_conjunto`, {
    method: "POST",
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_dominio: host }),
  });
  const filas = res.ok ? ((await res.json()) as { slug: string }[]) : [];
  const slug = filas[0]?.slug ?? null;
  cacheDominios.set(host, { slug, expira: Date.now() + 5 * 60_000 });
  return slug;
}

export async function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0];
  const { pathname } = request.nextUrl;

  // Dominio personalizado: conjunto.com/votaciones -> /c/<slug>/votaciones
  let rewriteTo: URL | null = null;
  let slugDominio: string | null = null;
  const esHostPlataforma = HOSTS_PLATAFORMA.some((h) => host === h || host.endsWith(`.${h}`));
  if (!esHostPlataforma && !RUTAS_SIN_REESCRITURA.some((r) => pathname.startsWith(r))) {
    slugDominio = await slugPorDominio(host);
    if (slugDominio) {
      rewriteTo = request.nextUrl.clone();
      rewriteTo.pathname = `/c/${slugDominio}${pathname === "/" ? "" : pathname}`;
    }
  }

  let response = rewriteTo ? NextResponse.rewrite(rewriteTo) : NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = rewriteTo ? NextResponse.rewrite(rewriteTo) : NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !RUTAS_PUBLICAS.some((r) => pathname.startsWith(r))) {
    const url = request.nextUrl.clone();
    url.pathname = "/ingresar";
    url.search = "";
    const slug = slugDominio ?? pathname.match(/^\/c\/([^/]+)/)?.[1];
    if (slug) url.searchParams.set("conjunto", slug);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
