# Настройка Supabase Database

Для того чтобы сохранять данные пользователей в реальной базе данных, вам необходимо создать таблицу `profiles` в вашем проекте Supabase.

## 1. Откройте SQL Editor в Supabase

Перейдите в ваш проект Supabase -> SQL Editor -> New Query.

## 2. Выполните следующий SQL код

Скопируйте и выполните этот код, чтобы создать таблицу профилей и настроить права доступа.

```sql
-- Создаем таблицу profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  nickname text,
  goals jsonb,
  biorhythm jsonb,
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Включаем Row Level Security (RLS) для безопасности
alter table public.profiles enable row level security;

-- Создаем политики доступа (Policies)

-- Пользователь может видеть свой профиль
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

-- Пользователь может вставлять свой профиль
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

-- Пользователь может обновлять свой профиль
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Настраиваем автоматическое создание профиля при регистрации (опционально, но рекомендуется)
-- Это создаст запись в profiles сразу после регистрации через Apple/Google/Email

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Триггер
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## 3. Проверьте подключение

После выполнения SQL запроса, приложение автоматически начнет сохранять данные профиля (никнейм, цели, биоритмы) в эту таблицу.

## Примечание

Приложение использует таблицу `profiles` для синхронизации данных между устройствами. Если таблица не создана, данные будут сохраняться только локально на устройстве.
