export const ESTADO_RESERVA = {
  programada: { texto: "Programada", tono: "marca" },
  en_curso: { texto: "En curso", tono: "verde" },
  finalizada: { texto: "Finalizada", tono: "gris" },
  cancelada: { texto: "Cancelada", tono: "rojo" },
} as const;

export const PLATAFORMAS = ["airbnb", "booking", "vrbo", "directa", "otra"] as const;
