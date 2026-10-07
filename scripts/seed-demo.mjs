// Crea (o recrea) el conjunto de demostración "Mirador del Parque" con datos realistas.
// Uso: node --env-file=.env.local scripts/seed-demo.mjs
import { createClient } from "@supabase/supabase-js";

const SLUG = "mirador-del-parque";
const CLAVE = "Demo2026*";
const DOMINIO = "demo.easyhome.co";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const dia = (n = 0) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date(Date.now() + n * 86400_000));
const instante = (dias, hora = 10) => new Date(`${dia(dias)}T${String(hora).padStart(2, "0")}:00:00-05:00`).toISOString();

async function ok(promesa, que) {
  const { data, error } = await promesa;
  if (error) throw new Error(`${que}: ${error.message}`);
  return data;
}

async function usuario(alias, nombre, telefono, documento) {
  const email = `${alias}@${DOMINIO}`;
  const { data: existente } = await db.from("perfiles").select("id").eq("email", email).maybeSingle();
  let id = existente?.id;
  if (id) {
    await db.auth.admin.updateUserById(id, { password: CLAVE, user_metadata: { nombre } });
  } else {
    const { data, error } = await db.auth.admin.createUser({ email, password: CLAVE, email_confirm: true, user_metadata: { nombre } });
    if (error) throw new Error(`usuario ${email}: ${error.message}`);
    id = data.user.id;
  }
  await ok(db.from("perfiles").update({ nombre, telefono, tipo_documento: "CC", numero_documento: documento }).eq("id", id), "perfil");
  return id;
}

console.log("Limpiando demo anterior…");
await db.from("conjuntos").delete().eq("slug", SLUG);

const conjunto = await ok(
  db
    .from("conjuntos")
    .insert({
      slug: SLUG,
      nombre: "Mirador del Parque",
      nit: "901.456.789-3",
      direccion: "Cra. 2 #12-45, Bocagrande",
      ciudad: "Cartagena",
      color_primario: "#2563eb",
      permite_renta_corta: true,
      dias_descargos: 5,
    })
    .select()
    .single(),
  "conjunto",
);
const C = conjunto.id;

console.log("Usuarios…");
const u = {
  admin: await usuario("administracion", "Laura Gómez Arango", "300 412 8890", "52814732"),
  consejo: await usuario("consejo", "Carlos Restrepo Vélez", "310 556 2201", "71234890"),
  consejo2: await usuario("consejo2", "Patricia Navarro Díaz", "315 772 3410", "45678123"),
  propietaria: await usuario("propietaria", "María Fernanda Ruiz", "301 998 1144", "1047382910"),
  anfitrion: await usuario("anfitrion", "Santiago Mejía · Caribe Stays", "320 441 7788", "1128443901"),
  arrendatario: await usuario("arrendatario", "Julián Ospina Torres", "317 220 6655", "1020345678"),
  porteria: await usuario("porteria", "Jorge Pérez (Portería)", "605 660 1122", "73128456"),
};
const otros = [
  ["prop.101", "Andrea Castillo"], ["prop.102", "Héctor Bermúdez"], ["prop.201", "Lucía Fernández"],
  ["prop.202", "Ricardo Salazar"], ["prop.302", "Natalia Ortega"], ["prop.401", "Felipe Cárdenas"],
  ["prop.402", "Camila Rojas"], ["prop.501", "Gustavo Herrera"], ["prop.t2-104", "Isabel Montoya"],
  ["prop.t2-305", "Daniel Quintero"], ["prop.t2-405", "Valentina Pardo"],
];
for (const [alias, nombre] of otros) u[alias] = await usuario(alias, nombre, null, null);

console.log("Unidades…");
const defs = [
  ["Torre 1", "101", "prop.101"], ["Torre 1", "102", "prop.102"], ["Torre 1", "201", "prop.201"],
  ["Torre 1", "202", "prop.202"], ["Torre 1", "301", "consejo"], ["Torre 1", "302", "prop.302"],
  ["Torre 1", "401", "prop.401"], ["Torre 1", "402", "prop.402"], ["Torre 1", "501", "prop.501"],
  ["Torre 1", "502", "propietaria"], ["Torre 2", "104", "prop.t2-104"], ["Torre 2", "204", "propietaria"],
  ["Torre 2", "305", "prop.t2-305"], ["Torre 2", "405", "prop.t2-405"],
];
const rentaCorta = new Set(["Torre 1-502", "Torre 2-204", "Torre 2-305"]);
const unidades = await ok(
  db
    .from("unidades")
    .insert(
      defs.map(([torre, numero]) => {
        const grande = torre === "Torre 2";
        return {
          conjunto_id: C, torre, numero, tipo: "apartamento",
          coeficiente: grande ? 8 : 6.8,
          cuota_administracion: grande ? 452000 : 385000,
          permite_renta_corta: rentaCorta.has(`${torre}-${numero}`),
        };
      }),
    )
    .select(),
  "unidades",
);
const U = Object.fromEntries(unidades.map((x) => [`${x.torre}-${x.numero}`, x.id]));
const propietarioDe = {};

const vinculos = defs.map(([torre, numero, alias]) => {
  propietarioDe[`${torre}-${numero}`] = u[alias];
  return { unidad_id: U[`${torre}-${numero}`], usuario_id: u[alias], relacion: "propietario", desde: "2021-03-01" };
});
vinculos.push(
  { unidad_id: U["Torre 2-204"], usuario_id: u.anfitrion, relacion: "administrador_propiedad", desde: "2024-06-01" },
  { unidad_id: U["Torre 2-305"], usuario_id: u.anfitrion, relacion: "administrador_propiedad", desde: "2025-01-15" },
  { unidad_id: U["Torre 1-101"], usuario_id: u.arrendatario, relacion: "arrendatario", desde: "2025-08-01", hasta: "2026-07-31" },
);
await ok(db.from("unidad_personas").insert(vinculos), "vínculos");

const membresias = [
  { usuario_id: u.admin, rol: "administracion" },
  { usuario_id: u.consejo, rol: "consejo" },
  { usuario_id: u.consejo2, rol: "consejo" },
  { usuario_id: u.porteria, rol: "porteria" },
  { usuario_id: u.anfitrion, rol: "administrador_propiedad" },
  { usuario_id: u.arrendatario, rol: "arrendatario" },
  ...[...new Set(Object.values(propietarioDe))].map((id) => ({ usuario_id: id, rol: "propietario" })),
];
await ok(db.from("membresias").insert(membresias.map((m) => ({ ...m, conjunto_id: C }))), "membresías");

console.log("Reglamento…");
const articulos = [
  ["I. Disposiciones generales", "1", "Objeto", "El presente reglamento regula los derechos y obligaciones de los copropietarios, tenedores y visitantes del Conjunto Residencial Mirador del Parque, sometido al régimen de propiedad horizontal de la Ley 675 de 2001.", false],
  ["I. Disposiciones generales", "2", "Obligatoriedad", "Las disposiciones de este reglamento son de obligatorio cumplimiento para propietarios, arrendatarios, administradores de propiedad, huéspedes y visitantes. El propietario responde solidariamente por las faltas de quienes ocupen su unidad.", false],
  ["III. Convivencia", "18", "Ruido y horarios de descanso", "Se prohíbe producir ruidos o sonidos que perturben la tranquilidad de los residentes. Entre las 10:00 p. m. y las 7:00 a. m. de domingo a jueves, y entre las 12:00 a. m. y las 8:00 a. m. los viernes, sábados y festivos, el volumen deberá ser imperceptible desde las unidades vecinas.", true],
  ["III. Convivencia", "19", "Mascotas", "Las mascotas deberán transitar por zonas comunes con traílla y, en el caso de razas potencialmente peligrosas, con bozal. Sus propietarios deben recoger los excrementos de inmediato. No se permite el ingreso de mascotas a la piscina, el gimnasio ni el salón social.", true],
  ["III. Convivencia", "20", "Manejo de residuos", "Los residuos se depositarán clasificados en el cuarto de basuras de cada torre, en bolsas cerradas, entre las 6:00 a. m. y las 9:00 p. m. Está prohibido dejar bolsas en pasillos, escaleras o puntos fijos.", true],
  ["IV. Zonas comunes", "24", "Uso de la piscina", "La piscina funciona de martes a domingo de 8:00 a. m. a 8:00 p. m. Es obligatorio ducharse antes de ingresar y usar traje de baño adecuado. Los menores de 12 años deben estar acompañados por un adulto responsable. No se permiten envases de vidrio.", true],
  ["IV. Zonas comunes", "25", "Parqueaderos", "Cada unidad tiene asignado un parqueadero privado. Los parqueaderos de visitantes son de uso temporal y no podrán ocuparse por más de 24 horas continuas. Se prohíbe estacionar en zonas de circulación y en parqueaderos ajenos.", true],
  ["IV. Zonas comunes", "26", "Salón social", "El salón social se reserva con la administración con 8 días de anticipación, previo pago del depósito. El horario máximo de uso es hasta la 1:00 a. m.", false],
  ["V. Renta corta", "31", "Arrendamiento por días", "Solo las unidades autorizadas por la asamblea podrán destinarse a vivienda turística, previo registro en el RNT. El propietario o su administrador de propiedad deberá registrar en la plataforma a cada huésped, con su documento de identidad, antes de su llegada. Portería negará el ingreso a personas no registradas.", true],
  ["V. Renta corta", "32", "Responsabilidad por huéspedes", "El propietario y el administrador de propiedad deberán informar a los huéspedes sobre este reglamento. Las infracciones cometidas por huéspedes se imputarán a la unidad.", true],
  ["VI. Obras", "36", "Remodelaciones", "Toda obra al interior de las unidades debe informarse por escrito a la administración. Los trabajos ruidosos solo podrán realizarse de lunes a viernes entre 8:00 a. m. y 5:00 p. m., y los sábados entre 9:00 a. m. y 1:00 p. m.", true],
  ["VIII. Sanciones", "45", "Procedimiento sancionatorio", "Antes de imponer una sanción, la administración notificará por escrito al infractor los hechos y la norma incumplida, concediéndole cinco (5) días hábiles para presentar descargos. Las multas no podrán exceder, cada una, dos veces el valor de la expensa ordinaria mensual de la unidad (art. 59, Ley 675 de 2001).", false],
];
const arts = await ok(
  db
    .from("rph_articulos")
    .insert(articulos.map(([capitulo, numero, titulo, texto, sancionable]) => ({ conjunto_id: C, capitulo, numero, titulo, texto, sancionable })))
    .select("id, numero"),
  "artículos",
);
const A = Object.fromEntries(arts.map((a) => [a.numero, a.id]));

console.log("Comunicados…");
const comunicados = await ok(
  db
    .from("comunicados")
    .insert([
      {
        conjunto_id: C, emisor: "administracion", autor_id: u.admin, audiencia: [], creado_en: instante(0, 8),
        titulo: "Mantenimiento preventivo de ascensores – Torre 1",
        cuerpo: "Estimados residentes:\n\nEl próximo jueves, entre las 8:00 a. m. y las 12:00 m., la empresa Ascensores del Caribe realizará el mantenimiento preventivo semestral del ascensor de la Torre 1. Durante este horario el equipo estará fuera de servicio.\n\nAgradecemos programar sus desplazamientos y la recepción de domicilios con anticipación. Las personas con movilidad reducida pueden comunicarse con la administración para coordinar apoyo.\n\nCordialmente,\nLaura Gómez Arango\nAdministradora",
      },
      {
        conjunto_id: C, emisor: "consejo", autor_id: u.consejo, audiencia: ["propietario", "administrador_propiedad"], creado_en: instante(-2, 18),
        titulo: "Nuevo protocolo para huéspedes de renta corta",
        cuerpo: "El Consejo de Administración informa que a partir del 1.º de noviembre todos los huéspedes de unidades destinadas a renta corta (Airbnb, Booking y similares) deberán estar registrados en Easy Home antes de su llegada.\n\n1. El propietario o administrador de propiedad registra la reserva con los datos y documento de cada huésped.\n2. Portería verifica el documento al ingreso. Las personas no registradas no podrán ingresar.\n3. Los huéspedes deben recibir copia del reglamento de convivencia, en especial los artículos 18 (ruido) y 24 (piscina).\n\nEste protocolo desarrolla los artículos 31 y 32 del RPH. Agradecemos su colaboración.\n\nCarlos Restrepo Vélez\nPresidente del Consejo",
      },
      {
        conjunto_id: C, emisor: "administracion", autor_id: u.admin, audiencia: [], creado_en: instante(-5, 9),
        titulo: "Convocatoria a Asamblea General Ordinaria 2026",
        cuerpo: "Se convoca a todos los propietarios a la Asamblea General Ordinaria que se realizará el sábado 7 de noviembre a las 9:00 a. m. en el salón social.\n\nOrden del día:\n1. Verificación del quórum.\n2. Elección de presidente y secretario de la asamblea.\n3. Informe de gestión de la administración y del consejo.\n4. Estados financieros a 30 de septiembre.\n5. Presupuesto y cuota de administración 2027.\n6. Proposiciones y varios.\n\nSi no puede asistir, puede otorgar poder escrito a otra persona.",
      },
      {
        conjunto_id: C, emisor: "administracion", autor_id: u.admin, audiencia: [], creado_en: instante(-9, 15),
        titulo: "Recordatorio: horarios y normas de la piscina",
        cuerpo: "Recordamos que la piscina funciona de martes a domingo, de 8:00 a. m. a 8:00 p. m. Los lunes permanece cerrada por mantenimiento.\n\nNo se permiten envases de vidrio, mascotas ni música a alto volumen. Los menores de 12 años deben estar acompañados por un adulto. Gracias por cuidar nuestras zonas comunes.",
      },
      {
        conjunto_id: C, emisor: "administracion", autor_id: u.admin, audiencia: ["porteria"], creado_en: instante(-12, 7),
        titulo: "Instrucciones para portería: control de huéspedes",
        cuerpo: "A partir de hoy, el ingreso de huéspedes de renta corta se valida exclusivamente con el módulo Portería de Easy Home. Digite el número de documento: si aparece AUTORIZADO, registre el ingreso; si aparece NO AUTORIZADO, comuníquese con el propietario antes de permitir el acceso.",
      },
    ])
    .select("id, audiencia"),
  "comunicados",
);
const lecturas = [];
for (const c of comunicados.slice(1)) {
  for (const id of [u.consejo, u.consejo2, u.admin, u["prop.101"], u["prop.201"], u["prop.402"], u.anfitrion]) lecturas.push({ comunicado_id: c.id, usuario_id: id });
}
await ok(db.from("comunicado_lecturas").upsert(lecturas, { ignoreDuplicates: true }), "lecturas");

console.log("Votaciones…");
async function votacion({ titulo, descripcion, emisor, creador, opciones, abre, cierra, votos }) {
  const v = await ok(
    db.from("votaciones").insert({ conjunto_id: C, titulo, descripcion, emisor, creador_id: creador, ponderada: true, abre_en: abre, cierra_en: cierra }).select().single(),
    "votación",
  );
  const ops = await ok(db.from("votacion_opciones").insert(opciones.map((texto, orden) => ({ votacion_id: v.id, texto, orden }))).select(), "opciones");
  if (votos.length) {
    await ok(
      db.from("votos").insert(
        votos.map(([unidad, opcion]) => ({ votacion_id: v.id, unidad_id: U[unidad], opcion_id: ops[opcion].id, usuario_id: propietarioDe[unidad] })),
      ),
      "votos",
    );
  }
  return v;
}

await votacion({
  titulo: "¿Aprueba el cambio de empresa de vigilancia a Seguridad Atlántico Ltda.?",
  descripcion: "El consejo evaluó tres propuestas. Seguridad Atlántico ofrece guardas con curso de supervisor, rondas con control electrónico y un costo mensual 4 % menor al contrato actual. El cambio se haría efectivo el 1.º de diciembre.",
  emisor: "consejo", creador: u.consejo, opciones: ["Sí, apruebo el cambio", "No, mantener la empresa actual", "Me abstengo"],
  abre: instante(-3, 8), cierra: instante(4, 20),
  votos: [["Torre 1-101", 0], ["Torre 1-201", 0], ["Torre 1-202", 1], ["Torre 1-301", 0], ["Torre 1-401", 0], ["Torre 2-104", 2], ["Torre 2-405", 0]],
});

const cerrada = await votacion({
  titulo: "Horario extendido de la piscina los sábados",
  descripcion: "Propuesta para extender el horario de la piscina los sábados hasta las 10:00 p. m., con un salvavidas adicional cuyo costo se cubre con el fondo de imprevistos.",
  emisor: "administracion", creador: u.admin, opciones: ["A favor", "En contra"],
  abre: instante(-20, 8), cierra: instante(1, 20),
  votos: [["Torre 1-101", 0], ["Torre 1-102", 0], ["Torre 1-201", 1], ["Torre 1-202", 0], ["Torre 1-301", 0], ["Torre 1-302", 1], ["Torre 1-401", 0], ["Torre 1-402", 0], ["Torre 1-501", 1], ["Torre 2-104", 0], ["Torre 2-305", 0], ["Torre 2-405", 1]],
});
await ok(db.from("votaciones").update({ cierra_en: instante(-10, 20) }).eq("id", cerrada.id), "cerrar votación");

await votacion({
  titulo: "Instalación de paneles solares en la cubierta de la Torre 2",
  descripcion: "Proyecto para reducir hasta en 35 % el costo de energía de zonas comunes. La inversión se financiaría con cuota extraordinaria en 6 meses. Se adjuntarán las cotizaciones antes de abrir la votación.",
  emisor: "consejo", creador: u.consejo2, opciones: ["A favor", "En contra", "Me abstengo"],
  abre: instante(6, 8), cierra: instante(13, 20), votos: [],
});

console.log("Sanciones…");
async function sancion(datos, eventos = []) {
  const s = await ok(db.from("sanciones").insert({ conjunto_id: C, creada_por: u.admin, ...datos }).select().single(), "sanción");
  for (const e of eventos) await ok(db.from("sancion_eventos").insert({ sancion_id: s.id, ...e }), "evento");
  return s;
}

await sancion(
  {
    unidad_id: U["Torre 2-204"], destinatario_id: u.propietaria, articulo_id: A["18"], tipo: "multa", valor: 452000,
    hechos: "El sábado a la 1:40 a. m. los huéspedes de la unidad realizaron una reunión con música a alto volumen en el balcón. Tres residentes de la Torre 2 presentaron queja a portería y el guarda solicitó bajar el volumen en dos ocasiones sin atención. Consta en la minuta de portería, folio 118.",
    fecha_hechos: dia(-3), plazo_descargos: dia(2), creado_en: instante(-2, 10), estado: "notificada",
  },
  [
    {
      autor_id: u.propietaria, tipo: "descargo", creado_en: instante(-1, 19),
      texto: "Reconozco el incidente. Los huéspedes eran un grupo de 4 personas que incumplieron las normas de la casa de Airbnb. Ya presenté reclamo en la plataforma, los calificamos negativamente y reforzamos el mensaje de bienvenida con el horario de silencio. Solicito que la multa se convierta en llamado de atención, por ser la primera falta de la unidad.",
    },
  ],
);

await sancion(
  {
    unidad_id: U["Torre 1-402"], destinatario_id: u["prop.402"], articulo_id: A["19"], tipo: "llamado_atencion", valor: 0,
    hechos: "Se observó en dos ocasiones al perro de la unidad transitando sin traílla por el lobby y la zona de juegos infantiles, según registro de cámaras del 14 y 16 del mes anterior.",
    fecha_hechos: dia(-25), plazo_descargos: dia(-18), creado_en: instante(-23, 11), estado: "confirmada",
  },
  [{ autor_id: u.admin, tipo: "decision", creado_en: instante(-15, 9), texto: "Sanción confirmada. Vencido el plazo sin descargos, se confirma el llamado de atención y se recuerda que la reincidencia dará lugar a multa conforme al artículo 45." }],
);

await sancion(
  {
    unidad_id: U["Torre 1-202"], destinatario_id: u["prop.202"], articulo_id: A["25"], tipo: "multa", valor: 192500,
    hechos: "El vehículo de placas JKL-482, asociado a la unidad, ocupó el parqueadero de visitantes V-3 durante 4 días consecutivos pese a la notificación verbal de portería.",
    fecha_hechos: dia(-40), plazo_descargos: dia(-33), creado_en: instante(-38, 10), estado: "pagada",
  },
  [
    { autor_id: u.admin, tipo: "decision", creado_en: instante(-30, 9), texto: "Sanción confirmada. Los descargos no desvirtúan los hechos registrados en minuta y cámaras." },
    { autor_id: u.admin, tipo: "decision", creado_en: instante(-21, 16), texto: "Pago registrado. Se recibió el pago junto con la cuota de administración del mes." },
  ],
);

await sancion({
  unidad_id: U["Torre 1-502"], destinatario_id: u.propietaria, articulo_id: A["36"], tipo: "llamado_atencion", valor: 0,
  hechos: "El martes se realizaron trabajos de demolición de enchape con taladro percutor entre las 6:15 p. m. y las 7:30 p. m., fuera del horario permitido para obras.",
  fecha_hechos: dia(-1), plazo_descargos: dia(5), creado_en: instante(0, 9), estado: "notificada",
});

console.log("Reservas y huéspedes…");
async function reserva(datos, huespedes, accesos = []) {
  const r = await ok(db.from("reservas").insert({ conjunto_id: C, notas: null, ...datos }).select().single(), "reserva");
  const hs = await ok(db.from("huespedes").insert(huespedes.map((h) => ({ reserva_id: r.id, autoriza_datos: true, es_menor: false, telefono: null, placa_vehiculo: null, ...h }))).select(), "huéspedes");
  for (const [i, tipo, dias, hora] of accesos) {
    await ok(db.from("accesos").insert({ huesped_id: hs[i].id, tipo, registrado_por: u.porteria, registrado_en: instante(dias, hora) }), "acceso");
  }
}

await reserva(
  { unidad_id: U["Torre 2-204"], registrada_por: u.anfitrion, plataforma: "airbnb", codigo_reserva: "HMQ4T8ZP2K", check_in: dia(-1), check_out: dia(3), estado: "en_curso", notas: "Familia con un menor. Llegaron en carro, usan el parqueadero privado 204." },
  [
    { nombre: "Thomas Becker", tipo_documento: "PP", numero_documento: "C8F4K21L9", nacionalidad: "Alemania", telefono: "+49 151 2233 4455" },
    { nombre: "Anna Becker", tipo_documento: "PP", numero_documento: "C8F4K21M3", nacionalidad: "Alemania" },
    { nombre: "Lukas Becker", tipo_documento: "PP", numero_documento: "C8F4K22A7", nacionalidad: "Alemania", es_menor: true },
  ],
  [[0, "ingreso", -1, 15], [1, "ingreso", -1, 15], [2, "ingreso", -1, 15], [0, "salida", 0, 9], [0, "ingreso", 0, 13]],
);

await reserva(
  { unidad_id: U["Torre 1-502"], registrada_por: u.propietaria, plataforma: "booking", codigo_reserva: "4412987703", check_in: dia(0), check_out: dia(2), estado: "programada", notas: "Llegada estimada 4:00 p. m. Entregar llaves en portería (sobre a nombre de Camilo)." },
  [
    { nombre: "Camilo Andrés Vargas", tipo_documento: "CC", numero_documento: "1015443221", nacionalidad: "Colombia", telefono: "312 334 9087", placa_vehiculo: "FTR-219" },
    { nombre: "Daniela Gómez Pineda", tipo_documento: "CC", numero_documento: "1032556784", nacionalidad: "Colombia" },
  ],
);

await reserva(
  { unidad_id: U["Torre 2-305"], registrada_por: u.anfitrion, plataforma: "airbnb", codigo_reserva: "HM8XW2LN5D", check_in: dia(3), check_out: dia(8), estado: "programada" },
  [
    { nombre: "Emily Johnson", tipo_documento: "PP", numero_documento: "584930021", nacionalidad: "Estados Unidos", telefono: "+1 305 555 0142" },
    { nombre: "Michael Johnson", tipo_documento: "PP", numero_documento: "584930022", nacionalidad: "Estados Unidos" },
  ],
);

await reserva(
  { unidad_id: U["Torre 2-204"], registrada_por: u.anfitrion, plataforma: "airbnb", codigo_reserva: "HMZ71RT0QA", check_in: dia(-12), check_out: dia(-8), estado: "finalizada" },
  [{ nombre: "Sofía Martínez Leal", tipo_documento: "CE", numero_documento: "6634921", nacionalidad: "Venezuela" }],
  [[0, "ingreso", -12, 16], [0, "salida", -8, 11]],
);

console.log(`\nListo: /c/${SLUG}`);
console.log(`Usuarios (contraseña ${CLAVE}):`);
for (const a of ["administracion", "consejo", "propietaria", "anfitrion", "arrendatario", "porteria"]) console.log(`  ${a}@${DOMINIO}`);
