import { Formulario } from "@/components/formulario";
import { Campo, Encabezado, Entrada, Tarjeta } from "@/components/ui";
import { exigir } from "@/lib/contexto";
import { guardarConfiguracion } from "./actions";

export const metadata = { title: "Configuración" };

export default async function Configuracion({ params }: { params: Promise<{ conjunto: string }> }) {
  const { conjunto } = await params;
  const { conjunto: c } = await exigir(conjunto, "administracion");

  return (
    <>
      <Encabezado titulo="Configuración" descripcion="Datos del conjunto, marca y reglas de convivencia." />
      <Tarjeta className="max-w-2xl">
        <Formulario accion={guardarConfiguracion.bind(null, conjunto)}>
          <h2 className="font-semibold">Datos generales</h2>
          <Campo etiqueta="Nombre"><Entrada name="nombre" defaultValue={c.nombre} required /></Campo>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="NIT"><Entrada name="nit" defaultValue={c.nit ?? ""} /></Campo>
            <Campo etiqueta="Dirección"><Entrada name="direccion" defaultValue={c.direccion ?? ""} /></Campo>
            <Campo etiqueta="Ciudad"><Entrada name="ciudad" defaultValue={c.ciudad ?? ""} /></Campo>
          </div>

          <h2 className="pt-4 font-semibold">Marca</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <Campo etiqueta="URL del logo" ayuda="Imagen PNG o SVG, idealmente cuadrada."><Entrada name="logo_url" type="url" defaultValue={c.logo_url ?? ""} /></Campo>
            <Campo etiqueta="Color"><Entrada name="color_primario" type="color" defaultValue={c.color_primario} className="h-10 p-1" /></Campo>
          </div>
          <Campo etiqueta="Dominio propio" ayuda="Ej: app.miconjunto.com. Crea un registro CNAME hacia la plataforma y agrégalo al proyecto en Vercel.">
            <Entrada name="dominio_personalizado" defaultValue={c.dominio_personalizado ?? ""} placeholder="app.miconjunto.com" />
          </Campo>

          <h2 className="pt-4 font-semibold">Reglas</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="permite_renta_corta" defaultChecked={c.permite_renta_corta} className="accent-marca" />
            El RPH permite renta corta / vivienda turística (habilita el registro de huéspedes)
          </label>
          <Campo etiqueta="Días para presentar descargos"><Entrada name="dias_descargos" type="number" min={1} max={30} defaultValue={c.dias_descargos} className="max-w-24" /></Campo>
        </Formulario>
      </Tarjeta>
    </>
  );
}
