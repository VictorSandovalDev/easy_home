-- =====================================================================
-- Easy Home · Esquema inicial
-- Plataforma multi-conjunto (marca blanca) para propiedad horizontal.
-- Todo dato de negocio cuelga de un conjunto y se aísla con RLS.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type rol_conjunto as enum (
  'administracion',
  'consejo',
  'propietario',
  'administrador_propiedad',
  'arrendatario',
  'porteria'
);

create type relacion_unidad as enum ('propietario', 'administrador_propiedad', 'arrendatario');
create type tipo_unidad as enum ('apartamento', 'casa', 'local', 'otro');
create type emisor_comunicado as enum ('administracion', 'consejo');
create type tipo_sancion as enum ('llamado_atencion', 'multa');
create type estado_sancion as enum ('notificada', 'en_descargos', 'confirmada', 'revocada', 'pagada');
create type estado_reserva as enum ('programada', 'en_curso', 'finalizada', 'cancelada');
create type tipo_acceso as enum ('ingreso', 'salida');

-- ---------------------------------------------------------------------
-- Plataforma (operador de la marca blanca)
-- ---------------------------------------------------------------------
create table plataforma_admins (
  usuario_id uuid primary key references auth.users on delete cascade,
  creado_en timestamptz not null default now()
);

create table conjuntos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  nombre text not null,
  nit text,
  direccion text,
  ciudad text,
  -- Marca blanca
  logo_url text,
  color_primario text not null default '#0f766e' check (color_primario ~ '^#[0-9a-fA-F]{6}$'),
  dominio_personalizado text unique,
  -- Reglas de negocio
  permite_renta_corta boolean not null default false,
  dias_descargos smallint not null default 5 check (dias_descargos between 1 and 30),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null default '',
  email text,
  telefono text,
  tipo_documento text,
  numero_documento text,
  creado_en timestamptz not null default now()
);

create table membresias (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos on delete cascade,
  usuario_id uuid not null references auth.users on delete cascade,
  rol rol_conjunto not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  unique (conjunto_id, usuario_id, rol)
);
create index on membresias (usuario_id);

create table unidades (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos on delete cascade,
  torre text,
  numero text not null,
  tipo tipo_unidad not null default 'apartamento',
  coeficiente numeric(8,5) not null default 0 check (coeficiente >= 0 and coeficiente <= 100),
  cuota_administracion numeric(14,2) not null default 0,
  permite_renta_corta boolean not null default false,
  creado_en timestamptz not null default now(),
  unique (conjunto_id, torre, numero)
);

create table unidad_personas (
  id uuid primary key default gen_random_uuid(),
  unidad_id uuid not null references unidades on delete cascade,
  usuario_id uuid not null references auth.users on delete cascade,
  relacion relacion_unidad not null,
  desde date not null default current_date,
  hasta date,
  unique (unidad_id, usuario_id, relacion)
);
create index on unidad_personas (usuario_id);

-- ---------------------------------------------------------------------
-- Funciones de autorización (security definer para evitar recursión RLS)
-- ---------------------------------------------------------------------
create or replace function es_admin_plataforma() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from plataforma_admins where usuario_id = auth.uid());
$$;

create or replace function es_miembro(p_conjunto uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select es_admin_plataforma() or exists (
    select 1 from membresias
    where conjunto_id = p_conjunto and usuario_id = auth.uid() and activo
  );
$$;

create or replace function tiene_rol(p_conjunto uuid, p_roles rol_conjunto[]) returns boolean
language sql stable security definer set search_path = public as $$
  select es_admin_plataforma() or exists (
    select 1 from membresias
    where conjunto_id = p_conjunto and usuario_id = auth.uid() and activo and rol = any(p_roles)
  );
$$;

-- Administración y consejo gestionan el conjunto.
create or replace function es_gestor(p_conjunto uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select tiene_rol(p_conjunto, array['administracion','consejo']::rol_conjunto[]);
$$;

create or replace function tiene_relacion_unidad(p_unidad uuid, p_relaciones relacion_unidad[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from unidad_personas
    where unidad_id = p_unidad and usuario_id = auth.uid() and relacion = any(p_relaciones)
      and (hasta is null or hasta >= current_date)
  );
$$;

create or replace function conjunto_de_unidad(p_unidad uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select conjunto_id from unidades where id = p_unidad;
$$;

-- Perfil automático al registrarse
create or replace function crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger al_crear_usuario after insert on auth.users
  for each row execute function crear_perfil();

-- ---------------------------------------------------------------------
-- Comunicados (difusión de información)
-- ---------------------------------------------------------------------
create table comunicados (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos on delete cascade,
  autor_id uuid not null references auth.users,
  emisor emisor_comunicado not null,
  titulo text not null,
  cuerpo text not null,
  -- Roles destinatarios; vacío = todos
  audiencia rol_conjunto[] not null default '{}',
  creado_en timestamptz not null default now()
);
create index on comunicados (conjunto_id, creado_en desc);

create table comunicado_lecturas (
  comunicado_id uuid not null references comunicados on delete cascade,
  usuario_id uuid not null references auth.users on delete cascade,
  leido_en timestamptz not null default now(),
  primary key (comunicado_id, usuario_id)
);

-- ---------------------------------------------------------------------
-- Votaciones / consultas a propietarios
-- Un voto por unidad, emitido por un propietario de la unidad.
-- ---------------------------------------------------------------------
create table votaciones (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos on delete cascade,
  creador_id uuid not null references auth.users,
  emisor emisor_comunicado not null,
  titulo text not null,
  descripcion text not null default '',
  ponderada boolean not null default true, -- por coeficiente de copropiedad
  abre_en timestamptz not null default now(),
  cierra_en timestamptz not null,
  creado_en timestamptz not null default now(),
  check (cierra_en > abre_en)
);

create table votacion_opciones (
  id uuid primary key default gen_random_uuid(),
  votacion_id uuid not null references votaciones on delete cascade,
  texto text not null,
  orden smallint not null default 0
);

create table votos (
  id uuid primary key default gen_random_uuid(),
  votacion_id uuid not null references votaciones on delete cascade,
  unidad_id uuid not null references unidades on delete cascade,
  opcion_id uuid not null references votacion_opciones on delete cascade,
  usuario_id uuid not null references auth.users,
  emitido_en timestamptz not null default now(),
  unique (votacion_id, unidad_id)
);

-- Valida que el voto sea de un propietario, en plazo, con opción válida
create or replace function validar_voto() returns trigger
language plpgsql security definer set search_path = public as $$
declare v votaciones;
begin
  select * into v from votaciones where id = new.votacion_id;
  if now() < v.abre_en or now() > v.cierra_en then
    raise exception 'La votación no está abierta';
  end if;
  if conjunto_de_unidad(new.unidad_id) <> v.conjunto_id then
    raise exception 'La unidad no pertenece al conjunto';
  end if;
  if not exists (select 1 from votacion_opciones where id = new.opcion_id and votacion_id = new.votacion_id) then
    raise exception 'Opción inválida';
  end if;
  if not exists (
    select 1 from unidad_personas
    where unidad_id = new.unidad_id and usuario_id = new.usuario_id and relacion = 'propietario'
      and (hasta is null or hasta >= current_date)
  ) then
    raise exception 'Solo el propietario de la unidad puede votar';
  end if;
  return new;
end $$;

create trigger antes_de_votar before insert or update on votos
  for each row execute function validar_voto();

-- Resultados agregados (no expone quién votó qué)
create or replace function resultados_votacion(p_votacion uuid)
returns table (opcion_id uuid, texto text, votos bigint, coeficiente numeric)
language sql stable security definer set search_path = public as $$
  select o.id, o.texto, count(v.id), coalesce(sum(u.coeficiente), 0)
  from votacion_opciones o
  join votaciones vt on vt.id = o.votacion_id
  left join votos v on v.opcion_id = o.id
  left join unidades u on u.id = v.unidad_id
  where o.votacion_id = p_votacion and es_miembro(vt.conjunto_id)
  group by o.id, o.texto, o.orden
  order by o.orden;
$$;

-- ---------------------------------------------------------------------
-- RPH (Reglamento de Propiedad Horizontal)
-- ---------------------------------------------------------------------
create table rph_articulos (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos on delete cascade,
  capitulo text,
  numero text not null,
  titulo text not null,
  texto text not null,
  sancionable boolean not null default false,
  creado_en timestamptz not null default now(),
  unique (conjunto_id, numero)
);

-- ---------------------------------------------------------------------
-- Sanciones: llamados de atención y multas con debido proceso
-- (Ley 675 de 2001, arts. 59 y 60)
-- ---------------------------------------------------------------------
create table sanciones (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos on delete cascade,
  unidad_id uuid not null references unidades on delete cascade,
  destinatario_id uuid not null references auth.users,
  articulo_id uuid references rph_articulos on delete set null,
  tipo tipo_sancion not null,
  hechos text not null,
  valor numeric(14,2) not null default 0 check (valor >= 0),
  estado estado_sancion not null default 'notificada',
  fecha_hechos date not null default current_date,
  plazo_descargos date not null,
  creada_por uuid not null references auth.users,
  creado_en timestamptz not null default now(),
  check (tipo = 'multa' or valor = 0)
);
create index on sanciones (conjunto_id, creado_en desc);
create index on sanciones (destinatario_id);

create table sancion_eventos (
  id uuid primary key default gen_random_uuid(),
  sancion_id uuid not null references sanciones on delete cascade,
  autor_id uuid not null references auth.users,
  tipo text not null check (tipo in ('descargo', 'decision', 'nota')),
  texto text not null,
  creado_en timestamptz not null default now()
);

-- El destinatario solo puede presentar descargos dentro del plazo
create or replace function validar_evento_sancion() returns trigger
language plpgsql security definer set search_path = public as $$
declare s sanciones;
begin
  select * into s from sanciones where id = new.sancion_id;
  if new.tipo = 'descargo' then
    if s.destinatario_id <> new.autor_id then
      raise exception 'Solo el destinatario puede presentar descargos';
    end if;
    if current_date > s.plazo_descargos then
      raise exception 'El plazo para descargos venció el %', s.plazo_descargos;
    end if;
    update sanciones set estado = 'en_descargos' where id = s.id and estado = 'notificada';
  end if;
  return new;
end $$;

create trigger antes_de_evento_sancion before insert on sancion_eventos
  for each row execute function validar_evento_sancion();

-- ---------------------------------------------------------------------
-- Renta corta (Airbnb y similares): reservas y huéspedes
-- ---------------------------------------------------------------------
create table reservas (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos on delete cascade,
  unidad_id uuid not null references unidades on delete cascade,
  registrada_por uuid not null references auth.users,
  plataforma text not null default 'airbnb',
  codigo_reserva text,
  check_in date not null,
  check_out date not null,
  estado estado_reserva not null default 'programada',
  notas text,
  creado_en timestamptz not null default now(),
  check (check_out > check_in)
);
create index on reservas (conjunto_id, check_in);

create table huespedes (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references reservas on delete cascade,
  nombre text not null,
  tipo_documento text not null,
  numero_documento text not null,
  nacionalidad text not null default 'Colombia',
  telefono text,
  es_menor boolean not null default false,
  placa_vehiculo text,
  autoriza_datos boolean not null default false, -- Ley 1581 de 2012
  creado_en timestamptz not null default now()
);
create index on huespedes (numero_documento);

create table accesos (
  id uuid primary key default gen_random_uuid(),
  huesped_id uuid not null references huespedes on delete cascade,
  tipo tipo_acceso not null,
  registrado_por uuid not null references auth.users,
  registrado_en timestamptz not null default now(),
  observacion text
);

-- Las reservas solo se registran en unidades habilitadas para renta corta
create or replace function validar_reserva() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from unidades u join conjuntos c on c.id = u.conjunto_id
    where u.id = new.unidad_id and u.conjunto_id = new.conjunto_id
      and c.permite_renta_corta and u.permite_renta_corta
  ) then
    raise exception 'La unidad no está habilitada para renta corta según el RPH';
  end if;
  return new;
end $$;

create trigger antes_de_reserva before insert or update of unidad_id, conjunto_id on reservas
  for each row execute function validar_reserva();

-- Búsqueda en portería: ¿esta persona tiene autorización hoy?
create or replace function buscar_huesped_autorizado(p_conjunto uuid, p_documento text)
returns table (
  huesped_id uuid, nombre text, numero_documento text, unidad text,
  check_in date, check_out date, reserva_id uuid
)
language sql stable security definer set search_path = public as $$
  select h.id, h.nombre, h.numero_documento,
         concat_ws(' - ', u.torre, u.numero), r.check_in, r.check_out, r.id
  from huespedes h
  join reservas r on r.id = h.reserva_id
  join unidades u on u.id = r.unidad_id
  where r.conjunto_id = p_conjunto
    and tiene_rol(p_conjunto, array['porteria','administracion']::rol_conjunto[])
    and h.numero_documento = trim(p_documento)
    and r.estado in ('programada','en_curso')
    and current_date between r.check_in and r.check_out;
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table plataforma_admins enable row level security;
alter table conjuntos enable row level security;
alter table perfiles enable row level security;
alter table membresias enable row level security;
alter table unidades enable row level security;
alter table unidad_personas enable row level security;
alter table comunicados enable row level security;
alter table comunicado_lecturas enable row level security;
alter table votaciones enable row level security;
alter table votacion_opciones enable row level security;
alter table votos enable row level security;
alter table rph_articulos enable row level security;
alter table sanciones enable row level security;
alter table sancion_eventos enable row level security;
alter table reservas enable row level security;
alter table huespedes enable row level security;
alter table accesos enable row level security;

-- Plataforma
create policy "plataforma: ver propio" on plataforma_admins for select using (usuario_id = auth.uid());

-- Conjuntos
create policy "conjuntos: miembros ven" on conjuntos for select using (es_miembro(id));
create policy "conjuntos: plataforma crea" on conjuntos for insert with check (es_admin_plataforma());
create policy "conjuntos: administracion edita" on conjuntos for update
  using (tiene_rol(id, array['administracion']::rol_conjunto[]));
create policy "conjuntos: plataforma borra" on conjuntos for delete using (es_admin_plataforma());

-- Perfiles: uno mismo, o compañeros de conjunto
create policy "perfiles: ver" on perfiles for select using (
  id = auth.uid() or es_admin_plataforma() or exists (
    select 1 from membresias m1 join membresias m2 on m1.conjunto_id = m2.conjunto_id
    where m1.usuario_id = auth.uid() and m2.usuario_id = perfiles.id and m1.activo
  )
);
create policy "perfiles: editar propio" on perfiles for update using (id = auth.uid());

-- Membresías
create policy "membresias: miembros ven" on membresias for select using (es_miembro(conjunto_id));
create policy "membresias: administracion gestiona" on membresias for all
  using (tiene_rol(conjunto_id, array['administracion']::rol_conjunto[]))
  with check (tiene_rol(conjunto_id, array['administracion']::rol_conjunto[]));

-- Unidades
create policy "unidades: miembros ven" on unidades for select using (es_miembro(conjunto_id));
create policy "unidades: administracion gestiona" on unidades for all
  using (tiene_rol(conjunto_id, array['administracion']::rol_conjunto[]))
  with check (tiene_rol(conjunto_id, array['administracion']::rol_conjunto[]));

create policy "unidad_personas: miembros ven" on unidad_personas for select
  using (es_miembro(conjunto_de_unidad(unidad_id)));
create policy "unidad_personas: administracion gestiona" on unidad_personas for all
  using (tiene_rol(conjunto_de_unidad(unidad_id), array['administracion']::rol_conjunto[]))
  with check (tiene_rol(conjunto_de_unidad(unidad_id), array['administracion']::rol_conjunto[]));
-- El propietario puede asignar administrador de propiedad o arrendatario a su unidad
create policy "unidad_personas: propietario asigna" on unidad_personas for insert
  with check (relacion <> 'propietario' and tiene_relacion_unidad(unidad_id, array['propietario']::relacion_unidad[]));
create policy "unidad_personas: propietario retira" on unidad_personas for delete
  using (relacion <> 'propietario' and tiene_relacion_unidad(unidad_id, array['propietario']::relacion_unidad[]));

-- Comunicados: gestores publican; cada quien ve los dirigidos a sus roles
create policy "comunicados: ver" on comunicados for select using (
  es_gestor(conjunto_id) or (
    es_miembro(conjunto_id) and (
      cardinality(audiencia) = 0 or exists (
        select 1 from membresias m
        where m.conjunto_id = comunicados.conjunto_id and m.usuario_id = auth.uid()
          and m.activo and m.rol = any(comunicados.audiencia)
      )
    )
  )
);
create policy "comunicados: publicar" on comunicados for insert with check (
  autor_id = auth.uid() and tiene_rol(conjunto_id, array[emisor::text::rol_conjunto])
);
create policy "comunicados: borrar propio" on comunicados for delete using (autor_id = auth.uid());

create policy "lecturas: propias" on comunicado_lecturas for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "lecturas: gestores ven" on comunicado_lecturas for select using (
  exists (select 1 from comunicados c where c.id = comunicado_id and es_gestor(c.conjunto_id))
);

-- Votaciones
create policy "votaciones: ver" on votaciones for select using (es_miembro(conjunto_id));
create policy "votaciones: crear" on votaciones for insert with check (
  creador_id = auth.uid() and tiene_rol(conjunto_id, array[emisor::text::rol_conjunto])
);
create policy "opciones: ver" on votacion_opciones for select using (
  exists (select 1 from votaciones v where v.id = votacion_id and es_miembro(v.conjunto_id))
);
create policy "opciones: crear" on votacion_opciones for insert with check (
  exists (select 1 from votaciones v where v.id = votacion_id and v.creador_id = auth.uid())
);
-- El voto es secreto: cada propietario solo ve los suyos; los totales salen por resultados_votacion()
create policy "votos: ver propios" on votos for select using (usuario_id = auth.uid());
create policy "votos: emitir" on votos for insert with check (usuario_id = auth.uid());
create policy "votos: cambiar" on votos for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- RPH
create policy "rph: ver" on rph_articulos for select using (es_miembro(conjunto_id));
create policy "rph: gestionar" on rph_articulos for all
  using (tiene_rol(conjunto_id, array['administracion']::rol_conjunto[]))
  with check (tiene_rol(conjunto_id, array['administracion']::rol_conjunto[]));

-- Sanciones: las impone administración; las ven gestores y el destinatario
create policy "sanciones: ver" on sanciones for select using (
  es_gestor(conjunto_id) or destinatario_id = auth.uid()
);
create policy "sanciones: imponer" on sanciones for insert with check (
  creada_por = auth.uid() and tiene_rol(conjunto_id, array['administracion']::rol_conjunto[])
);
create policy "sanciones: decidir" on sanciones for update
  using (tiene_rol(conjunto_id, array['administracion']::rol_conjunto[]));

create policy "eventos: ver" on sancion_eventos for select using (
  exists (select 1 from sanciones s where s.id = sancion_id
          and (es_gestor(s.conjunto_id) or s.destinatario_id = auth.uid()))
);
create policy "eventos: crear" on sancion_eventos for insert with check (
  autor_id = auth.uid() and exists (
    select 1 from sanciones s where s.id = sancion_id and (
      (sancion_eventos.tipo = 'descargo' and s.destinatario_id = auth.uid()) or
      (sancion_eventos.tipo in ('decision','nota') and tiene_rol(s.conjunto_id, array['administracion']::rol_conjunto[]))
    )
  )
);

-- Reservas y huéspedes: los registran propietario o administrador de propiedad
create policy "reservas: ver" on reservas for select using (
  tiene_rol(conjunto_id, array['administracion','consejo','porteria']::rol_conjunto[])
  or tiene_relacion_unidad(unidad_id, array['propietario','administrador_propiedad']::relacion_unidad[])
);
create policy "reservas: registrar" on reservas for insert with check (
  registrada_por = auth.uid()
  and tiene_relacion_unidad(unidad_id, array['propietario','administrador_propiedad']::relacion_unidad[])
);
create policy "reservas: editar" on reservas for update using (
  tiene_relacion_unidad(unidad_id, array['propietario','administrador_propiedad']::relacion_unidad[])
  or tiene_rol(conjunto_id, array['administracion','porteria']::rol_conjunto[])
);

create policy "huespedes: ver" on huespedes for select using (
  exists (select 1 from reservas r where r.id = reserva_id and (
    tiene_rol(r.conjunto_id, array['administracion','porteria']::rol_conjunto[])
    or tiene_relacion_unidad(r.unidad_id, array['propietario','administrador_propiedad']::relacion_unidad[])
  ))
);
create policy "huespedes: gestionar" on huespedes for all using (
  exists (select 1 from reservas r where r.id = reserva_id
          and tiene_relacion_unidad(r.unidad_id, array['propietario','administrador_propiedad']::relacion_unidad[]))
) with check (
  exists (select 1 from reservas r where r.id = reserva_id
          and tiene_relacion_unidad(r.unidad_id, array['propietario','administrador_propiedad']::relacion_unidad[]))
);

create policy "accesos: ver" on accesos for select using (
  exists (select 1 from huespedes h join reservas r on r.id = h.reserva_id where h.id = huesped_id and (
    tiene_rol(r.conjunto_id, array['administracion','porteria']::rol_conjunto[])
    or tiene_relacion_unidad(r.unidad_id, array['propietario','administrador_propiedad']::relacion_unidad[])
  ))
);
create policy "accesos: porteria registra" on accesos for insert with check (
  registrado_por = auth.uid() and exists (
    select 1 from huespedes h join reservas r on r.id = h.reserva_id
    where h.id = huesped_id and tiene_rol(r.conjunto_id, array['porteria','administracion']::rol_conjunto[])
      and (accesos.tipo = 'salida' or (r.estado in ('programada','en_curso') and current_date between r.check_in and r.check_out))
  )
);

-- ---------------------------------------------------------------------
-- Datos públicos de marca para la pantalla de ingreso (sin sesión)
-- ---------------------------------------------------------------------
create or replace function marca_conjunto(p_slug text default null, p_dominio text default null)
returns table (id uuid, slug text, nombre text, logo_url text, color_primario text)
language sql stable security definer set search_path = public as $$
  select id, slug, nombre, logo_url, color_primario from conjuntos
  where activo and ((p_slug is not null and slug = p_slug) or (p_dominio is not null and dominio_personalizado = p_dominio))
  limit 1;
$$;
grant execute on function marca_conjunto(text, text) to anon, authenticated;
