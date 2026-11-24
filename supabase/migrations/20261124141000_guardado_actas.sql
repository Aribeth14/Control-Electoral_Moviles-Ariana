begin;

create table public.actas (
  id bigint generated always as identity primary key,
  junta_id uuid not null references public.juntas(id),
  dignidad text not null check (dignidad in ('alcaldia', 'prefectura')),
  registrada_por uuid not null references public.perfiles(id),
  blancos integer not null check (blancos >= 0),
  nulos integer not null check (nulos >= 0),
  sufragantes integer not null check (sufragantes >= 0),
  registrada_en timestamptz not null default now(),
  unique (junta_id, dignidad)
);

create table public.votos_acta (
  acta_id bigint not null references public.actas(id),
  candidatura_id bigint not null references public.candidaturas(id),
  votos integer not null check (votos >= 0),
  primary key (acta_id, candidatura_id)
);

alter table public.actas enable row level security;
alter table public.votos_acta enable row level security;

revoke all on table public.actas, public.votos_acta
  from public, anon, authenticated;

create function public.registrar_acta(
  p_numero integer,
  p_dignidad text,
  p_blancos integer,
  p_nulos integer,
  p_sufragantes integer,
  p_votos jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_recinto public.perfiles.recinto_id%type;
  v_junta public.juntas.id%type;
  v_acta bigint;
  v_cantidad bigint;
  v_distintas bigint;
  v_validas bigint;
  v_total bigint;
begin
  select p.recinto_id into v_recinto
  from public.perfiles p
  where p.id = v_usuario
    and p.rol = 'veedor'
    and p.correo_verificado is true
    and p.debe_cambiar_clave is false
  for share;

  if v_recinto is null then
    raise exception 'Solo un veedor activo puede registrar actas.'
      using errcode = '42501';
  end if;

  select j.id into v_junta
  from public.juntas j
  where j.numero = p_numero
    and j.recinto_id = v_recinto
  for update;

  if v_junta is null or not exists (
    select 1
    from public.asignaciones_juntas a
    where a.junta_id = v_junta
      and a.veedor_id = v_usuario
      and a.finalizada_en is null
  ) then
    raise exception 'Esta junta no está asignada a tu cuenta.'
      using errcode = '42501';
  end if;

  if p_dignidad is null or p_dignidad not in ('alcaldia', 'prefectura')
    or p_blancos is null or p_blancos < 0
    or p_nulos is null or p_nulos < 0
    or p_sufragantes is null or p_sufragantes < 0
    or jsonb_typeof(p_votos) is distinct from 'array'
  then
    raise exception 'Revisa la dignidad y los valores del acta.';
  end if;

  if jsonb_array_length(p_votos) <> 5 then
    raise exception 'Ingresa los votos de las cinco candidaturas.';
  end if;

  select
    count(*),
    count(distinct v.candidatura_id),
    count(*) filter (where c.id is not null and v.votos >= 0),
    coalesce(sum(v.votos), 0)
  into v_cantidad, v_distintas, v_validas, v_total
  from jsonb_to_recordset(p_votos) as v(candidatura_id bigint, votos integer)
  left join public.candidaturas c
    on c.id = v.candidatura_id
   and c.dignidad = p_dignidad;

  if v_cantidad <> 5 or v_distintas <> 5 or v_validas <> 5 then
    raise exception 'Ingresa votos válidos para cinco candidaturas distintas de esa dignidad.';
  end if;

  if v_total + p_blancos + p_nulos <> p_sufragantes then
    raise exception 'Los votos, blancos y nulos deben sumar el total de sufragantes.';
  end if;

  insert into public.actas (
    junta_id, dignidad, registrada_por, blancos, nulos, sufragantes
  )
  values (
    v_junta, p_dignidad, v_usuario, p_blancos, p_nulos, p_sufragantes
  )
  on conflict (junta_id, dignidad) do nothing
  returning id into v_acta;

  if v_acta is null then
    raise exception 'Esta junta ya tiene un acta registrada para esa dignidad.';
  end if;

  insert into public.votos_acta (acta_id, candidatura_id, votos)
  select v_acta, v.candidatura_id, v.votos
  from jsonb_to_recordset(p_votos) as v(candidatura_id bigint, votos integer);

  return v_acta;
end;
$$;

revoke execute on function public.registrar_acta(
  integer, text, integer, integer, integer, jsonb
) from public, anon;

grant execute on function public.registrar_acta(
  integer, text, integer, integer, integer, jsonb
) to authenticated;

commit;
