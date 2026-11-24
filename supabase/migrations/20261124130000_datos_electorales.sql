begin;

create table public.organizaciones_politicas (
  id bigint generated always as identity primary key,
  numero_lista integer not null unique check (numero_lista > 0),
  nombre text not null check (btrim(nombre) <> '')
);

create table public.candidaturas (
  id bigint generated always as identity primary key,
  organizacion_id bigint not null
    references public.organizaciones_politicas(id),
  dignidad text not null check (dignidad in ('alcaldia', 'prefectura')),
  nombre_candidato text not null check (btrim(nombre_candidato) <> ''),
  unique (dignidad, organizacion_id)
);

alter table public.organizaciones_politicas enable row level security;
alter table public.candidaturas enable row level security;

revoke all on table
  public.organizaciones_politicas,
  public.candidaturas
from public, anon, authenticated;

insert into public.organizaciones_politicas (numero_lista, nombre)
values
  (101, 'Organización de prueba A'),
  (102, 'Organización de prueba B'),
  (103, 'Organización de prueba C'),
  (104, 'Organización de prueba D'),
  (105, 'Organización de prueba E');

insert into public.candidaturas (
  organizacion_id,
  dignidad,
  nombre_candidato
)
select o.id, datos.dignidad, datos.nombre_candidato
from (
  values
    (101, 'alcaldia', 'Ana Torres'),
    (102, 'alcaldia', 'Diego Molina'),
    (103, 'alcaldia', 'Carla Herrera'),
    (104, 'alcaldia', 'Mateo Salazar'),
    (105, 'alcaldia', 'Sofía Andrade'),
    (101, 'prefectura', 'Lucía Vega'),
    (102, 'prefectura', 'Andrés León'),
    (103, 'prefectura', 'Gabriela Ruiz'),
    (104, 'prefectura', 'Pablo Cevallos'),
    (105, 'prefectura', 'Elena Paredes')
) as datos(numero_lista, dignidad, nombre_candidato)
join public.organizaciones_politicas o
  on o.numero_lista = datos.numero_lista;

commit;
