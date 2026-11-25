begin;

create function public.consultar_detalle_acta_recinto(
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
  v_recinto public.perfiles.recinto_id%type;
  v_detalle jsonb;
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

  select jsonb_build_object(
    'numero', j.numero,
    'dignidad', a.dignidad,
    'blancos', a.blancos,
    'nulos', a.nulos,
    'sufragantes', a.sufragantes,
    'tiene_foto', a.foto_ruta is not null,
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
    and a.dignidad = p_dignidad;

  if v_detalle is null then
    raise exception 'El acta solicitada no está disponible en tu recinto.';
  end if;

  return v_detalle;
end;
$$;

revoke execute on function public.consultar_detalle_acta_recinto(integer, text)
  from public, anon, authenticated;

grant execute on function public.consultar_detalle_acta_recinto(integer, text)
  to authenticated;

commit;
