import { notFound } from "next/navigation";
import { Etiqueta, Tarjeta, Volver } from "@/components/ui";
import { contextoConjunto } from "@/lib/contexto";
import { fecha } from "@/lib/tipos";

export default async function Comunicado({ params }: { params: Promise<{ conjunto: string; id: string }> }) {
  const { conjunto, id } = await params;
  const ctx = await contextoConjunto(conjunto);
  const { data: c } = await ctx.supabase.from("comunicados").select("*").eq("id", id).eq("conjunto_id", ctx.conjunto.id).maybeSingle();
  if (!c) notFound();

  await ctx.supabase.from("comunicado_lecturas").upsert({ comunicado_id: id, usuario_id: ctx.user.id }, { ignoreDuplicates: true });

  const { count } = ctx.esGestor
    ? await ctx.supabase.from("comunicado_lecturas").select("*", { count: "exact", head: true }).eq("comunicado_id", id)
    : { count: null };

  return (
    <div className="max-w-3xl">
      <Volver href={ctx.ruta("/comunicados")}>Comunicados</Volver>
      <Tarjeta className="mt-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Etiqueta tono="marca">{c.emisor === "consejo" ? "Consejo" : "Administración"}</Etiqueta>
          <span className="text-sm text-tenue">{fecha(c.creado_en, true)}</span>
          {count !== null && <span className="ml-auto text-sm text-tenue">Leído por {count} persona{count === 1 ? "" : "s"}</span>}
        </div>
        <h1 className="mb-4 text-2xl font-semibold">{c.titulo}</h1>
        <div className="whitespace-pre-wrap leading-relaxed">{c.cuerpo}</div>
      </Tarjeta>
    </div>
  );
}
