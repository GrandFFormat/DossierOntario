-- DossierOntario — « Demander une explication » sur un projet de loi (le « challenge »).
--
-- À exécuter UNE FOIS dans le projet Supabase de DossierQuébec (SQL editor). Même compte pour
-- toute la famille Dossier : une personne connectée sur DQ a déjà son compte ici. Table à part
-- (on_bill_flags) parce que les projets ontariens se désignent par leur NUMÉRO sur ola.org
-- (« 9 », « PR27 »), pas par l'identifiant Données Québec de bill_flags.
--
-- Mêmes règles que DQ (voir dossierquebec/scripts/supabase-schema-flags.sql) :
--   - une ligne = une personne + un projet ; chacun ne voit que ses lignes ;
--   - 10 demandes par compte par 30 jours, appliqué ICI et pas dans le navigateur, via une
--     fonction security definer (une sous-requête directe dans la policy déclenche
--     « infinite recursion detected in policy ») ;
--   - le public ne voit que des TOTAUX (on_flag_counts), jamais qui a demandé quoi ;
--   - un compte de consultation (bibliothèque) ne peut pas écrire : même déclencheur que DQ.
-- Re-exécutable sans erreur.

create table if not exists public.on_bill_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  numero text not null,                       -- numéro du projet sur ola.org
  legislature smallint not null default 44,   -- 44e législature…
  session smallint not null default 1,        -- …1re session : les numéros repartent à 1 à chaque session
  created_at timestamptz not null default now(),
  unique (user_id, numero, legislature, session)
);

alter table public.on_bill_flags enable row level security;

create or replace function public.on_my_recent_flag_count()
returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.on_bill_flags
  where user_id = auth.uid() and created_at > now() - interval '30 days';
$$;
revoke execute on function public.on_my_recent_flag_count() from public, anon;
grant execute on function public.on_my_recent_flag_count() to authenticated;

drop policy if exists "on insert own flag" on public.on_bill_flags;
drop policy if exists "on select own flag" on public.on_bill_flags;
drop policy if exists "on delete own flag" on public.on_bill_flags;
create policy "on insert own flag" on public.on_bill_flags for insert
  with check (auth.uid() = user_id and public.on_my_recent_flag_count() < 10);
create policy "on select own flag" on public.on_bill_flags for select
  using (auth.uid() = user_id);
create policy "on delete own flag" on public.on_bill_flags for delete
  using (auth.uid() = user_id);
grant select, insert, delete on public.on_bill_flags to authenticated;

-- Les totaux publics de la session en cours — jamais d'identité.
create or replace function public.on_flag_counts()
returns table (numero text, cnt bigint)
language sql stable security definer set search_path = public as $$
  select numero, count(*)::bigint from public.on_bill_flags
  where legislature = 44 and session = 1
  group by numero;
$$;
grant execute on function public.on_flag_counts() to anon, authenticated;

-- Un compte de consultation ne peut rien écrire (fonction définie par
-- dossierquebec/scripts/supabase-schema-cadeaux.sql).
drop trigger if exists refus_lecture_seule_on_bill_flags on public.on_bill_flags;
create trigger refus_lecture_seule_on_bill_flags before insert or update or delete on public.on_bill_flags
  for each row execute function public.refus_lecture_seule();
