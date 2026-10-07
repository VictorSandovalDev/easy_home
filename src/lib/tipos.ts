export type Rol =
  | "administracion"
  | "consejo"
  | "propietario"
  | "administrador_propiedad"
  | "arrendatario"
  | "porteria";

export type Relacion = "propietario" | "administrador_propiedad" | "arrendatario";

export const NOMBRE_ROL: Record<Rol, string> = {
  administracion: "Administración",
  consejo: "Consejo",
  propietario: "Propietario",
  administrador_propiedad: "Administrador de propiedad",
  arrendatario: "Arrendatario",
  porteria: "Portería",
};

export const ROLES = Object.keys(NOMBRE_ROL) as Rol[];

export const NOMBRE_RELACION: Record<Relacion, string> = {
  propietario: "Propietario",
  administrador_propiedad: "Administrador de propiedad",
  arrendatario: "Arrendatario",
};

export type Conjunto = {
  id: string;
  slug: string;
  nombre: string;
  nit: string | null;
  direccion: string | null;
  ciudad: string | null;
  logo_url: string | null;
  color_primario: string;
  dominio_personalizado: string | null;
  permite_renta_corta: boolean;
  dias_descargos: number;
};

export type Unidad = {
  id: string;
  torre: string | null;
  numero: string;
  tipo: string;
  coeficiente: number;
  cuota_administracion: number;
  permite_renta_corta: boolean;
};

export type EstadoAccion = { error?: string; ok?: string } | undefined;

export function nombreUnidad(u: { torre: string | null; numero: string }) {
  return u.torre ? `${u.torre} - ${u.numero}` : u.numero;
}

export const pesos = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export const fecha = (d: string | Date, conHora = false) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    ...(conHora ? { timeStyle: "short" } : {}),
    timeZone: "America/Bogota",
  }).format(typeof d === "string" ? new Date(d.length === 10 ? `${d}T12:00:00` : d) : d);

/** Separa un RPH pegado como texto en artículos ("ARTÍCULO 12. Título. Texto…"). */
export function separarArticulos(texto: string) {
  const patron = /^\s*ART[IÍ]CULO\s+([0-9]+[A-Za-z°º]*)\s*[.:\-–—]?\s*/gim;
  const marcas = [...texto.matchAll(patron)];
  return marcas.map((m, i) => {
    const inicio = m.index! + m[0].length;
    const fin = i + 1 < marcas.length ? marcas[i + 1].index! : texto.length;
    const cuerpo = texto.slice(inicio, fin).trim();
    const corte = cuerpo.search(/[.\n]/);
    const titulo = corte > 0 && corte < 140 ? cuerpo.slice(0, corte).trim() : `Artículo ${m[1]}`;
    return { numero: m[1].replace(/[°º]/g, ""), titulo, texto: cuerpo };
  });
}

/** Fecha (YYYY-MM-DD) en Colombia, opcionalmente desplazada en días. */
export const hoyColombia = (dias = 0) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date(Date.now() + dias * 86400_000));
