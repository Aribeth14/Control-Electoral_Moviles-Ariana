begin;

alter table public.actas
  add column foto_ruta text unique,
  add column foto_nitidez double precision,
  add column gps_latitud double precision,
  add column gps_longitud double precision,
  add column gps_precision_m double precision,
  add column gps_capturado_en timestamptz;

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'evidencias-actas',
  'evidencias-actas',
  false,
  5242880,
  array['image/jpeg', 'image/png']
);

create policy "Veedor activo sube fotos en su carpeta"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'evidencias-actas'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and exists (
    select 1
    from public.perfiles p
    where p.id = (select auth.uid())
      and p.rol = 'veedor'
      and p.recinto_id is not null
      and p.correo_verificado is true
      and p.debe_cambiar_clave is false
  )
);

create function public.registrar_acta_con_evidencia(
  p_numero integer,
  p_dignidad text,
  p_blancos integer,
  p_nulos integer,
  p_sufragantes integer,
  p_votos jsonb,
  p_foto_ruta text,
  p_nitidez double precision,
  p_latitud double precision,
  p_longitud double precision,
  p_precision double precision,
  p_capturada_en timestamptz
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_acta bigint;
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para registrar el acta.'
      using errcode = '42501';
  end if;

  if p_nitidez is null or not (p_nitidez >= 100 and p_nitidez < 'Infinity')
    or p_latitud is null or not (p_latitud between -90 and 90)
    or p_longitud is null or not (p_longitud between -180 and 180)
    or p_precision is null or not (p_precision > 0 and p_precision < 'Infinity')
    or p_capturada_en is null or not isfinite(p_capturada_en)
  then
    raise exception 'Se requiere una foto aceptada y una ubicación válida.';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'evidencias-actas'
      and o.name = p_foto_ruta
      and o.owner_id = v_usuario::text
      and (storage.foldername(o.name))[1] = v_usuario::text
  ) then
    raise exception 'No se encontró la foto subida por tu cuenta.'
      using errcode = '42501';
  end if;

  -- Reutiliza la validación de junta asignada, candidaturas y totales.
  v_acta := public.registrar_acta(
    p_numero, p_dignidad, p_blancos, p_nulos, p_sufragantes, p_votos
  );

  update public.actas
  set foto_ruta = p_foto_ruta,
      foto_nitidez = p_nitidez,
      gps_latitud = p_latitud,
      gps_longitud = p_longitud,
      gps_precision_m = p_precision,
      gps_capturado_en = p_capturada_en
  where id = v_acta;

  return v_acta;
end;
$$;

revoke execute on function public.registrar_acta(
  integer, text, integer, integer, integer, jsonb
) from public, anon, authenticated;

revoke execute on function public.registrar_acta_con_evidencia(
  integer, text, integer, integer, integer, jsonb, text,
  double precision, double precision, double precision, double precision,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.registrar_acta_con_evidencia(
  integer, text, integer, integer, integer, jsonb, text,
  double precision, double precision, double precision, double precision,
  timestamptz
) to authenticated;

commit;
