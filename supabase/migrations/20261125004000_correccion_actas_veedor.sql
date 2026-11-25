begin;

create or replace function public.consultar_detalle_acta_recinto(
  p_numero integer,
  p_dignidad text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_recinto public.perfiles.recinto_id%type;
  v_rol text;
  v_detalle jsonb;
begin
  select p.recinto_id, p.rol
  into v_recinto, v_rol
  from public.perfiles p
  where p.id = v_usuario
    and p.rol in ('recinto', 'veedor')
    and p.correo_verificado is true
    and p.debe_cambiar_clave is false;

  if v_recinto is null then
    raise exception 'Tu cuenta no está habilitada para consultar actas.'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'numero', j.numero,
    'dignidad', a.dignidad,
    'blancos', a.blancos,
    'nulos', a.nulos,
    'sufragantes', a.sufragantes,
    'tiene_foto', a.foto_ruta is not null,
    'foto_ruta', a.foto_ruta,
    'gps_latitud', a.gps_latitud,
    'gps_longitud', a.gps_longitud,
    'votos', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'candidatura_id', c.id,
          'nombre', c.nombre_candidato,
          'votos', v.votos
        ) order by o.numero_lista
      )
      from public.votos_acta v
      join public.candidaturas c on c.id = v.candidatura_id
      join public.organizaciones_politicas o on o.id = c.organizacion_id
      where v.acta_id = a.id
    ), '[]'::jsonb)
  )
  into v_detalle
  from public.actas a
  join public.juntas j on j.id = a.junta_id
  where j.recinto_id = v_recinto
    and j.numero = p_numero
    and a.dignidad = p_dignidad
    and (
      v_rol = 'recinto'
      or exists (
        select 1
        from public.asignaciones_juntas aj
        where aj.junta_id = j.id
          and aj.veedor_id = v_usuario
          and aj.finalizada_en is null
      )
    );

  if v_detalle is null then
    raise exception 'El acta solicitada no está disponible para tu cuenta.';
  end if;

  return v_detalle;
end;
$$;

create or replace function public.corregir_acta_recinto(
  p_numero integer,
  p_dignidad text,
  p_blancos integer,
  p_nulos integer,
  p_sufragantes integer,
  p_votos jsonb,
  p_motivo text,
  p_foto_ruta text default null,
  p_foto_nitidez double precision default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_recinto public.perfiles.recinto_id%type;
  v_rol text;
  v_junta public.juntas.id%type;
  v_acta public.actas%rowtype;
  v_votos_anteriores jsonb;
  v_total bigint;
  v_distintas bigint;
  v_validas bigint;
begin
  select p.recinto_id, p.rol
  into v_recinto, v_rol
  from public.perfiles p
  where p.id = v_usuario
    and p.rol in ('recinto', 'veedor')
    and p.correo_verificado is true
    and p.debe_cambiar_clave is false
  for share;

  if v_recinto is null then
    raise exception 'Tu cuenta no está habilitada para corregir actas.'
      using errcode = '42501';
  end if;

  -- La reasignación usa el mismo bloqueo antes de cambiar al veedor.
  select j.id into v_junta
  from public.juntas j
  where j.recinto_id = v_recinto
    and j.numero = p_numero
  for update;

  if v_junta is null or (
    v_rol = 'veedor' and not exists (
      select 1
      from public.asignaciones_juntas aj
      where aj.junta_id = v_junta
        and aj.veedor_id = v_usuario
        and aj.finalizada_en is null
    )
  ) then
    raise exception 'No tienes permiso para corregir el acta de esta junta.'
      using errcode = '42501';
  end if;

  select a.* into v_acta
  from public.actas a
  where a.junta_id = v_junta
    and a.dignidad = p_dignidad
  for update;

  if not found then
    raise exception 'Todavía no hay un acta registrada para esta dignidad.';
  end if;

  if nullif(btrim(p_motivo), '') is null
    or char_length(btrim(p_motivo)) > 500
    or p_blancos is null or p_blancos < 0
    or p_nulos is null or p_nulos < 0
    or p_sufragantes is null or p_sufragantes < 0
    or jsonb_typeof(p_votos) is distinct from 'array'
  then
    raise exception 'Revisa el motivo y los valores de la corrección.';
  end if;

  if jsonb_array_length(p_votos) <> 5 then
    raise exception 'Ingresa los votos de las cinco candidaturas.';
  end if;

  select
    count(distinct v.candidatura_id),
    count(*) filter (
      where actual.candidatura_id is not null and v.votos >= 0
    ),
    coalesce(sum(v.votos), 0)
  into v_distintas, v_validas, v_total
  from jsonb_to_recordset(p_votos) as v(candidatura_id bigint, votos integer)
  left join public.votos_acta actual
    on actual.acta_id = v_acta.id
   and actual.candidatura_id = v.candidatura_id;

  if v_distintas <> 5 or v_validas <> 5 then
    raise exception 'Ingresa votos válidos para las cinco candidaturas del acta.';
  end if;

  if v_total + p_blancos + p_nulos <> p_sufragantes then
    raise exception 'Los votos, blancos y nulos deben sumar el total de sufragantes.';
  end if;

  if p_foto_ruta is not null then
    if p_foto_nitidez is null
      or not (p_foto_nitidez >= 100 and p_foto_nitidez < 'Infinity')
      or not exists (
        select 1
        from storage.objects o
        where o.bucket_id = 'evidencias-actas'
          and o.name = p_foto_ruta
          and o.owner_id = v_usuario::text
          and (storage.foldername(o.name))[1] = v_usuario::text
      )
    then
      raise exception 'La foto nueva debe estar aceptada y subida por tu cuenta.';
    end if;
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(v) order by v.candidatura_id),
    '[]'::jsonb
  )
  into v_votos_anteriores
  from public.votos_acta v
  where v.acta_id = v_acta.id;

  insert into public.correcciones_acta (
    acta_id, corregida_por, motivo, datos_anteriores
  )
  values (
    v_acta.id,
    v_usuario,
    btrim(p_motivo),
    jsonb_build_object('acta', to_jsonb(v_acta), 'votos', v_votos_anteriores)
  );

  update public.actas
  set blancos = p_blancos,
      nulos = p_nulos,
      sufragantes = p_sufragantes,
      foto_ruta = coalesce(p_foto_ruta, foto_ruta),
      foto_nitidez = case
        when p_foto_ruta is null then foto_nitidez
        else p_foto_nitidez
      end
  where id = v_acta.id;

  update public.votos_acta actual
  set votos = v.votos
  from jsonb_to_recordset(p_votos) as v(candidatura_id bigint, votos integer)
  where actual.acta_id = v_acta.id
    and actual.candidatura_id = v.candidatura_id;
end;
$$;

revoke execute on function public.consultar_detalle_acta_recinto(integer, text)
  from public, anon, authenticated;

grant execute on function public.consultar_detalle_acta_recinto(integer, text)
  to authenticated;

revoke execute on function public.corregir_acta_recinto(
  integer, text, integer, integer, integer, jsonb, text, text, double precision
) from public, anon, authenticated;

grant execute on function public.corregir_acta_recinto(
  integer, text, integer, integer, integer, jsonb, text, text, double precision
) to authenticated;

notify pgrst, 'reload schema';

commit;
