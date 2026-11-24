begin;

grant select on table
  public.organizaciones_politicas,
  public.candidaturas
to authenticated;

create policy "Usuarios autenticados consultan organizaciones"
on public.organizaciones_politicas
for select
to authenticated
using (true);

create policy "Usuarios autenticados consultan candidaturas"
on public.candidaturas
for select
to authenticated
using (true);

commit;
