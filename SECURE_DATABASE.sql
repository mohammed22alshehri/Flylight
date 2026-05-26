-- ============================================================
--   🔒 ملف الحماية الكامل — Fly Light Logistics
--
--   📌 شغّل هذا الملف مرة واحدة فقط في Supabase
--   📌 الخطوات:
--      1. ادخل Supabase Dashboard
--      2. اضغط SQL Editor (في القائمة اليسرى)
--      3. اضغط "New Query"
--      4. انسخ كل هذا الملف والصقه
--      5. اضغط "Run" (أو Ctrl+Enter)
--      6. تأكد من ظهور "Success" بدون أخطاء
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  الجزء 1: حماية جدول المساهمات (contributions)
-- ════════════════════════════════════════════════════════════

-- تفعيل الحماية
alter table contributions enable row level security;

-- حذف أي policies قديمة
drop policy if exists "anon_can_insert"      on contributions;
drop policy if exists "anon_cannot_read"     on contributions;
drop policy if exists "anon_cannot_update"   on contributions;
drop policy if exists "anon_cannot_delete"   on contributions;
drop policy if exists "rpc_full_access"      on contributions;

-- ✅ السماح للزوار بإضافة مساهماتهم فقط
create policy "anon_can_insert" on contributions
  for insert to anon, authenticated
  with check (true);

-- ❌ منع الزوار من قراءة المساهمات
create policy "anon_cannot_read" on contributions
  for select to anon
  using (false);

-- ❌ منع الزوار من التعديل
create policy "anon_cannot_update" on contributions
  for update to anon
  using (false);

-- ❌ منع الزوار من الحذف
create policy "anon_cannot_delete" on contributions
  for delete to anon
  using (false);


-- ════════════════════════════════════════════════════════════
--  الجزء 2: حماية جدول الشهادات (certificates)
-- ════════════════════════════════════════════════════════════

alter table certificates enable row level security;

drop policy if exists "anon_can_read_certs" on certificates;
drop policy if exists "anon_cannot_write_certs" on certificates;

-- ✅ السماح بقراءة الشهادات (للعرض في الموقع)
create policy "anon_can_read_certs" on certificates
  for select to anon, authenticated
  using (true);

-- ❌ منع أي كتابة مباشرة (فقط عبر RPC function)
create policy "anon_cannot_write_certs" on certificates
  for insert to anon
  with check (false);


-- ════════════════════════════════════════════════════════════
--  الجزء 3: حماية جدول الإدارة (admin_config)
-- ════════════════════════════════════════════════════════════

alter table admin_config enable row level security;

drop policy if exists "block_all_admin_config" on admin_config;

-- ❌ منع أي وصول مباشر — فقط عبر RPC function آمنة
create policy "block_all_admin_config" on admin_config
  for all to anon, authenticated
  using (false)
  with check (false);


-- ════════════════════════════════════════════════════════════
--  الجزء 4: دوال آمنة (RPC) لعرض المساهمات للإدارة
-- ════════════════════════════════════════════════════════════

-- دالة آمنة: عرض جميع المساهمات (تحتاج كلمة سر الإدارة)
create or replace function get_all_contributions_admin(admin_password text)
returns setof contributions
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
  is_valid boolean;
begin
  -- التحقق من كلمة سر الإدارة
  select password_hash into stored_hash from admin_config where id = 1;

  if stored_hash is null then
    raise exception 'الإدارة غير مُعدّة';
  end if;

  is_valid := stored_hash = extensions.crypt(admin_password, stored_hash);

  if not is_valid then
    raise exception 'كلمة سر الإدارة غير صحيحة';
  end if;

  -- إرجاع جميع المساهمات (فقط بعد التحقق)
  return query select * from contributions order by created_at desc;
end;
$$;

grant execute on function get_all_contributions_admin(text) to anon, authenticated;


-- ════════════════════════════════════════════════════════════
--  الجزء 5: دالة آمنة للموافقة على مساهمة
-- ════════════════════════════════════════════════════════════

create or replace function approve_contribution_admin(
  p_contribution_id bigint,
  admin_password text
)
returns table(success boolean, message text, cert_count int)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
  v_cert_count int;
begin
  -- التحقق من كلمة سر الإدارة
  select password_hash into stored_hash from admin_config where id = 1;

  if stored_hash != extensions.crypt(admin_password, stored_hash) then
    return query select false, 'كلمة سر الإدارة غير صحيحة'::text, 0;
    return;
  end if;

  -- تحديث الحالة
  update contributions
  set status = 'تمت الموافقة',
      review_date = to_char(now(), 'DD/MM/YYYY'),
      reviewed_at = now()
  where id = p_contribution_id;

  if not found then
    return query select false, 'المساهمة غير موجودة'::text, 0;
    return;
  end if;

  -- إصدار الشهادات
  select issue_certificates(p_contribution_id) into v_cert_count;

  return query select true, 'تمت الموافقة وإصدار الشهادات'::text, v_cert_count;
end;
$$;

grant execute on function approve_contribution_admin(bigint, text) to anon, authenticated;


-- ════════════════════════════════════════════════════════════
--  الجزء 6: دالة آمنة للرفض
-- ════════════════════════════════════════════════════════════

create or replace function reject_contribution_admin(
  p_contribution_id bigint,
  admin_password text
)
returns table(success boolean, message text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
begin
  select password_hash into stored_hash from admin_config where id = 1;

  if stored_hash != extensions.crypt(admin_password, stored_hash) then
    return query select false, 'كلمة سر الإدارة غير صحيحة'::text;
    return;
  end if;

  delete from contributions where id = p_contribution_id;

  if not found then
    return query select false, 'المساهمة غير موجودة'::text;
    return;
  end if;

  return query select true, 'تم رفض المساهمة بنجاح'::text;
end;
$$;

grant execute on function reject_contribution_admin(bigint, text) to anon, authenticated;


-- ════════════════════════════════════════════════════════════
--  ✅ انتهى!
--
--  الآن قاعدة بياناتك محمية:
--   ❌ لا يمكن لأحد قراءة المساهمات بدون كلمة سر الإدارة
--   ❌ لا يمكن لأحد التعديل أو الحذف بدون كلمة سر
--   ❌ لا يمكن لأحد الوصول لـ admin_config
--   ✅ الزوار يمكنهم فقط إضافة مساهماتهم
--   ✅ الزوار يمكنهم قراءة الشهادات (للعرض)
-- ════════════════════════════════════════════════════════════

notify pgrst, 'reload schema';
