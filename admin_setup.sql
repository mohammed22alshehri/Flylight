-- ============================================================
--   إعداد التحقق الآمن من كلمة سر الإدارة عبر Supabase
-- ============================================================
--  طريقة الاستخدام:
--   1) افتح Supabase ← SQL Editor ← New query
--   2) امسح أي نص موجود، ثم انسخ هذا الملف "كاملاً" والصقه
--   3) في السطر المعلَّم بالأسفل، استبدل
--         ضع_كلمة_السر_هنا
--      بكلمة السر التي تريدها (اترك علامتي الاقتباس ' ')
--   4) اضغط RUN
-- ============================================================

-- تأكد من وجود pgcrypto في نفس الـ schema
create extension if not exists pgcrypto schema extensions;

create table if not exists admin_config (
  id            int  primary key default 1,
  password_hash text not null,
  constraint single_row check (id = 1)
);

alter table admin_config enable row level security;

-- ↓↓↓ غيّر كلمة السر هنا فقط (بين علامتي الاقتباس) ↓↓↓
insert into admin_config (id, password_hash)
values (1, extensions.crypt('ضع_كلمة_السر_هنا', extensions.gen_salt('bf', 10)))
on conflict (id) do update
  set password_hash = excluded.password_hash;
-- ↑↑↑ غيّر كلمة السر في السطر أعلاه فقط ↑↑↑

create or replace function verify_admin_password(input_password text)
returns boolean
language plpgsql
security definer
-- نضيف extensions إلى search_path حتى تُعرف دالة crypt
set search_path = public, extensions
as $func$
declare
  v_hash text;
begin
  select password_hash into v_hash from admin_config where id = 1;
  if v_hash is null then
    return false;
  end if;
  return v_hash = crypt(input_password, v_hash);
end;
$func$;

grant execute on function verify_admin_password(text) to anon, authenticated;

notify pgrst, 'reload schema';

-- ============================================================
--  لتغيير كلمة السر لاحقاً، شغّل هذا السطر وحده (بكلمتك الجديدة):
--
--  update admin_config set password_hash = extensions.crypt('كلمتك_الجديدة', extensions.gen_salt('bf',10)) where id = 1;
-- ============================================================
