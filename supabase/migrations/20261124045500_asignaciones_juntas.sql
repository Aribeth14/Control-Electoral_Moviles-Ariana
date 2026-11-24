begin;

create table public.asignaciones_juntas (
  id bigint generated always as identity primary key,
  junta_id uuid not null references public.juntas(id),
  veedor_id uuid not null references public.perfiles(id),
  asignado_por uuid not null references public.perfiles(id),
  asignada_en timestamptz not null default now(),
  finalizada_en timestamptz
);

create unique index asignaciones_juntas_una_vigente
  on public.asignaciones_juntas (junta_id)
  where finalizada_en is null;

create index asignaciones_juntas_veedor_vigente
  on public.asignaciones_juntas (veedor_id)
  where finalizada_en is null;

alter table public.asignaciones_juntas enable row level security;
revoke all on public.asignaciones_juntas from public, anon, authenticated;

create function public.asignar_junta(
  p_numero integer,
  p_veedor_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_recinto public.perfiles.recinto_id%type;
  v_junta public.juntas.id%type;
begin
  select p.recinto_id into v_recinto
  from public.perfiles p
  where p.id = v_usuario
    and p.rol = 'recinto'
    and p.correo_verificado is true
    and p.debe_cambiar_clave is false
  for share;

  if v_recinto is null then
    raise exception 'Solo un coordinador activo puede asignar juntas.'
      using errcode = '42501';
  end if;

  select j.id into v_junta
  from public.juntas j
  where j.recinto_id = v_recinto
    and j.numero = p_numero
  for update;

  if not found then
    raise exception 'La junta no pertenece a tu recinto.';
  end if;

  perform 1
  from public.perfiles p
  where p.id = p_veedor_id
    and p.recinto_id = v_recinto
    and p.rol = 'veedor'
    and p.correo_verificado is true
    and p.debe_cambiar_clave is false
  for share;

  if not found then
    raise exception 'Selecciona un veedor activo de tu recinto.';
  end if;

  if exists (
    select 1
    from public.asignaciones_juntas a
    where a.junta_id = v_junta
      and a.veedor_id = p_veedor_id
      and a.finalizada_en is null
  ) then
    return;
  end if;

  update public.asignaciones_juntas
  set finalizada_en = now()
  where junta_id = v_junta
    and finalizada_en is null;

  insert into public.asignaciones_juntas (junta_id, veedor_id, asignado_por)
  values (v_junta, p_veedor_id, v_usuario);
end;
$$;

create function public.consultar_asignaciones_juntas()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles%rowtype;
begin
  select p.* into v_perfil
  from public.perfiles p
  where p.id = auth.uid()
    and p.rol in ('recinto', 'veedor')
    and p.recinto_id is not null
    and p.correo_verificado is true
    and p.debe_cambiar_clave is false;

  if not found then
    raise exception 'Tu cuenta no está habilitada para consultar juntas.'
      using errcode = '42501';
  end if;

  if v_perfil.rol = 'veedor' then
    return jsonb_build_object(
      'juntas', coalesce((
        select jsonb_agg(
          jsonb_build_object('numero', j.numero)
          order by j.numero
        )
        from public.asignaciones_juntas a
        join public.juntas j on j.id = a.junta_id
        where a.veedor_id = v_perfil.id
          and a.finalizada_en is null
          and j.recinto_id = v_perfil.recinto_id
      ), '[]'::jsonb),
      'veedores', '[]'::jsonb
    );
  end if;

  return jsonb_build_object(
    'juntas', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'numero', j.numero,
          'veedor_id', a.veedor_id,
          'veedor_nombre', concat_ws(' ', p.nombres, p.apellidos)
        )
        order by j.numero
      )
      from public.juntas j
      left join public.asignaciones_juntas a
        on a.junta_id = j.id and a.finalizada_en is null
      left join public.perfiles p on p.id = a.veedor_id
      where j.recinto_id = v_perfil.recinto_id
    ), '[]'::jsonb),
    'veedores', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'nombre', concat_ws(' ', p.nombres, p.apellidos)
        )
        order by p.apellidos, p.nombres
      )
      from public.perfiles p
      where p.recinto_id = v_perfil.recinto_id
        and p.rol = 'veedor'
        and p.correo_verificado is true
        and p.debe_cambiar_clave is false
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.asignar_junta(integer, uuid)
  from public, anon;
revoke execute on function public.consultar_asignaciones_juntas()
  from public, anon;

grant execute on function public.asignar_junta(integer, uuid)
  to authenticated;
grant execute on function public.consultar_asignaciones_juntas()
  to authenticated;

commit;