-- Las fechas de negocio (plazos de descargos, vigencia de reservas) se evalúan en
-- hora de Colombia. current_date usa UTC y después de las 7 p. m. ya es "mañana".
create or replace function hoy_co() returns date
language sql stable as $$ select (now() at time zone 'America/Bogota')::date $$;

create or replace function tiene_relacion_unidad(p_unidad uuid, p_relaciones relacion_unidad[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from unidad_personas
    where unidad_id = p_unidad and usuario_id = auth.uid() and relacion = any(p_relaciones)
      and (hasta is null or hasta >= hoy_co())
  );
$$;

create or replace function validar_evento_sancion() returns trigger
language plpgsql security definer set search_path = public as $$
declare s sanciones;
begin
  select * into s from sanciones where id = new.sancion_id;
  if new.tipo = 'descargo' then
    if s.destinatario_id <> new.autor_id then
      raise exception 'Solo el destinatario puede presentar descargos';
    end if;
    if hoy_co() > s.plazo_descargos then
      raise exception 'El plazo para descargos venció el %', s.plazo_descargos;
    end if;
    update sanciones set estado = 'en_descargos' where id = s.id and estado = 'notificada';
  end if;
  return new;
end $$;

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
      and (hasta is null or hasta >= hoy_co())
  ) then
    raise exception 'Solo el propietario de la unidad puede votar';
  end if;
  return new;
end $$;

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
    and hoy_co() between r.check_in and r.check_out;
$$;

drop policy "accesos: porteria registra" on accesos;
create policy "accesos: porteria registra" on accesos for insert with check (
  registrado_por = auth.uid() and exists (
    select 1 from huespedes h join reservas r on r.id = h.reserva_id
    where h.id = huesped_id and tiene_rol(r.conjunto_id, array['porteria','administracion']::rol_conjunto[])
      and (accesos.tipo = 'salida' or (r.estado in ('programada','en_curso') and hoy_co() between r.check_in and r.check_out))
  )
);
