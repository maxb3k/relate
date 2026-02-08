create table if not exists personas (
  id text primary key,
  name text not null,
  role text not null,
  tagline text not null,
  warmth int not null default 7,
  directness int not null default 7,
  humor int not null default 3,
  validation_first boolean not null default true,
  ask_one_question boolean not null default true,
  max_sentences int not null default 4,
  persona_style_prompt text not null,
  doctrine text,
  faq jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key,
  persona_id text not null references personas(id),
  user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists turns (
  id uuid primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  persona_id text not null references personas(id),
  transcript text not null,
  response_text text not null,
  input_audio_url text,
  output_audio_url text,
  created_at timestamptz not null default now()
);

create index if not exists turns_session_created_idx on turns(session_id, created_at);

-- Keep last 10 turns per session for low-cost MVP storage.
create or replace function trim_turns_per_session() returns trigger as $$
begin
  delete from turns
  where id in (
    select id from turns
    where session_id = new.session_id
    order by created_at desc
    offset 10
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists turns_trim_trigger on turns;
create trigger turns_trim_trigger
after insert on turns
for each row execute function trim_turns_per_session();
