begin;

create or replace function public.consultar_estado_actas_recinto()
returns table (
  numero integer,
  alcaldia_reportada boolean,
  prefectura_reportada boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_recinto public.perfiles.recinto_id%type;
begin
  select p.recinto_id
  into v_recinto
  from public.perfiles p
  where p.id = auth.uid()
    and p.rol = 'recinto'
    and p.correo_verificado is true
    and p.debe_cambiar_clave is false;

  if v_recinto is null then
    raise exception 'Solo un coordinador activo puede consultar su recinto.'
      using errcode = '42501';
  end if;

  return query
  select
    j.numero::integer,
    exists (
      select 1
      from public.actas a
      where a.junta_id = j.id and a.dignidad = 'alcaldia'
    ),
    exists (
      select 1
      from public.actas a
      where a.junta_id = j.id and a.dignidad = 'prefectura'
    )
  from public.juntas j
  where j.recinto_id = v_recinto
  order by j.numero;
end;
$$;

revoke execute on function public.consultar_estado_actas_recinto()
  from public, anon, authenticated;

grant execute on function public.consultar_estado_actas_recinto()
  to authenticated;

notify pgrst, 'reload schema';

commit;
