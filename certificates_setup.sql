-- ============================================================
--   إعداد جدول شهادات الأسهم
--   شغّل هذا الملف مرة واحدة في Supabase → SQL Editor → New query
-- ============================================================

-- 1) تسلسل الأرقام التسلسلية (atomic — يمنع تكرار الأرقام حتى مع موافقات متزامنة)
create sequence if not exists certificate_serial_seq start 1;

-- 2) جدول الشهادات
create table if not exists certificates (
  id              bigserial primary key,
  serial_no       int not null default nextval('certificate_serial_seq'),
  contribution_id bigint not null references contributions(id) on delete cascade,
  owner_name      text not null,
  owner_phone     text not null,
  share_value     numeric not null default 50,
  issued_at       timestamp with time zone default now()
);

-- فهرس فريد: لا يمكن أن يُكرَّر رقم تسلسلي
create unique index if not exists certificates_serial_no_idx
  on certificates(serial_no);

-- فهرس على contribution_id للبحث السريع
create index if not exists certificates_contribution_idx
  on certificates(contribution_id);

-- 3) Row Level Security
alter table certificates enable row level security;

-- القراءة مفتوحة (الكتابة تتم فقط عبر الدالة الآمنة)
create policy "certificates_read"
  on certificates for select
  to anon, authenticated
  using (true);

-- 4) الدالة الآمنة لإصدار الشهادات عند الموافقة
--    - security definer: تعمل بصلاحيات المالك (تتجاوز RLS عند الكتابة)
--    - تمنع التكرار: إذا سبق إصدار شهادات لهذه المساهمة تُرجع 0
create or replace function issue_certificates(p_contribution_id bigint)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name   text;
  v_phone  text;
  v_amount numeric;
  v_shares int;
  i        int;
begin
  -- جلب بيانات المساهمة (يجب أن تكون معتمدة)
  select name, phone, amount
  into   v_name, v_phone, v_amount
  from   contributions
  where  id = p_contribution_id
    and  status = 'تمت الموافقة';

  if not found then
    raise exception 'المساهمة % غير موجودة أو غير معتمدة', p_contribution_id;
  end if;

  -- منع إعادة الإصدار
  if exists (
    select 1 from certificates where contribution_id = p_contribution_id
  ) then
    return 0;
  end if;

  -- عدد الأسهم: كل 50 ريال = سهم
  v_shares := greatest(1, floor(v_amount / 50)::int);

  -- إدخال الشهادات (nextval يُنتج أرقاماً فريدة وآمنة)
  for i in 1..v_shares loop
    insert into certificates (contribution_id, owner_name, owner_phone, share_value)
    values (p_contribution_id, v_name, v_phone, 50);
  end loop;

  return v_shares;
end;
$$;

grant execute on function issue_certificates(bigint) to anon, authenticated;

notify pgrst, 'reload schema';

-- ============================================================
--  للاستعلام عن شهادات مساهم معين:
--    select * from certificates where contribution_id = <ID> order by serial_no;
--
--  لمشاهدة جميع الشهادات:
--    select c.serial_no, ct.name, ct.amount, c.issued_at
--    from certificates c
--    join contributions ct on ct.id = c.contribution_id
--    order by c.serial_no;
-- ============================================================
