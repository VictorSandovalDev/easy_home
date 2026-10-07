export function estadoVotacion(v: { abre_en: string; cierra_en: string }) {
  const ahora = Date.now();
  if (ahora < Date.parse(v.abre_en)) return { texto: "Programada", tono: "gris" as const };
  if (ahora > Date.parse(v.cierra_en)) return { texto: "Cerrada", tono: "rojo" as const };
  return { texto: "Abierta", tono: "verde" as const };
}
