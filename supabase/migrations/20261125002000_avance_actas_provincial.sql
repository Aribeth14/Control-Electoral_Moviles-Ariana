begin;

create or replace function public.consultar_avance_actas_provincial()
returns table (
  recinto_id text,
  recinto text,
  parroquia text,
  juntas_totales bigint,
  alcaldia_reportadas bigint,
  prefectura_reportadas bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.perfiles p
    where p.id = (select auth.uid())
      and p.rol = 'provincial'
      and p.debe_cambiar_clave is false
  ) then
    raise exception 'Solo un provincial habilitado puede consultar el avance.'
      using errcode = '42501';
  end if;

  return query
  select
    r.id::text,
    r.nombre::text,
    r.parroquia::text,
    count(distinct j.id),
    count(distinct j.id) filter (where a.dignidad = 'alcaldia'),
    count(distinct j.id) filter (where a.dignidad = 'prefectura')
  from public.recintos r
  left join public.juntas j on j.recinto_id = r.id
  left join public.actas a on a.junta_id = j.id
  group by r.id, r.nombre, r.parroquia
  order by r.parroquia, r.nombre;
end;
$$;

revoke execute on function public.consultar_avance_actas_provincial()
  from public, anon, authenticated;

grant execute on function public.consultar_avance_actas_provincial()
  to authenticated;

notify pgrst, 'reload schema';

commit;
