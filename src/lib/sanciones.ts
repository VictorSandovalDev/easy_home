export const ESTADO_SANCION = {
  notificada: { texto: "Notificada", tono: "ambar" },
  en_descargos: { texto: "Descargos presentados", tono: "marca" },
  confirmada: { texto: "Confirmada", tono: "rojo" },
  revocada: { texto: "Revocada", tono: "gris" },
  pagada: { texto: "Pagada", tono: "verde" },
} as const;

export const TIPO_SANCION = { llamado_atencion: "Llamado de atención", multa: "Multa" } as const;
