begin;

create or replace function public.consultar_resultados_actas_provincial(
  p_recinto_id text default null
)
returns jsonb
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
    raise exception 'Solo un provincial habilitado puede consultar los resultados.'
      using errcode = '42501';
  end if;

  return (
    with actas_filtradas as (
      select
        a.id,
        a.dignidad,
        a.gps_latitud,
        a.gps_longitud,
        j.numero as junta,
        r.nombre as recinto
      from public.actas a
      join public.juntas j on j.id = a.junta_id
      join public.recintos r on r.id = j.recinto_id
      where p_recinto_id is null or r.id::text = p_recinto_id
    ),
    totales as (
      select v.candidatura_id, sum(v.votos) as votos
      from public.votos_acta v
      join actas_filtradas a on a.id = v.acta_id
      group by v.candidatura_id
    )
    select jsonb_build_object(
      'votos', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'dignidad', c.dignidad,
            'candidato', c.nombre_candidato,
            'lista', o.numero_lista,
            'votos', coalesce(t.votos, 0)
          )
          order by c.dignidad, o.numero_lista
        )
        from public.candidaturas c
        join public.organizaciones_politicas o on o.id = c.organizacion_id
        left join totales t on t.candidatura_id = c.id
      ), '[]'::jsonb),
      'actas', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'recinto', a.recinto,
            'junta', a.junta,
            'dignidad', a.dignidad,
            'latitud', a.gps_latitud,
            'longitud', a.gps_longitud
          )
          order by a.recinto, a.junta, a.dignidad, a.id
        )
        from actas_filtradas a
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke execute on function public.consultar_resultados_actas_provincial(text)
  from public, anon, authenticated;

grant execute on function public.consultar_resultados_actas_provincial(text)
  to authenticated;

notify pgrst, 'reload schema';

commit;
