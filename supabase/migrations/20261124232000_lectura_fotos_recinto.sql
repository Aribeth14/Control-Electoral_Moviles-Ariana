begin;

create function public.puede_leer_foto_acta_recinto(p_ruta text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles p
    join public.juntas j on j.recinto_id = p.recinto_id
    join public.actas a on a.junta_id = j.id
    where p.id = (select auth.uid())
      and p.rol = 'recinto'
      and p.correo_verificado is true
      and p.debe_cambiar_clave is false
      and a.foto_ruta = p_ruta
  );
$$;

revoke execute on function public.puede_leer_foto_acta_recinto(text)
  from public, anon, authenticated;

grant execute on function public.puede_leer_foto_acta_recinto(text)
  to authenticated;

create policy "Coordinador lee fotos de actas de su recinto"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'evidencias-actas'
  and public.puede_leer_foto_acta_recinto(name)
);

commit;
