// ===== Supabase Configuration =====
// استبدل هذه القيم بقيم مشروعك من supabase.com
const SUPABASE_URL = 'SUPABASE_URL';
const SUPABASE_ANON_KEY = 'SUPABASE_KEY';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Database Operations =====

async function dbInsert(contribution) {
  // تم التعديل لتتوافق الأسماء مع السكربت الجديد لقاعدة البيانات
  const { data, error } = await db
    .from('contributions')
    .insert([{\n      name:         contribution.name,\n      phone:        contribution.phone,\n      email:        contribution.email,\n      amount:       contribution.amount,\n      notes:        contribution.notes,\n      receipt:      contribution.receipt_url, // تطابق حقل receipt في جدولك\n      receipt_name: contribution.receipt_name,\n      status:       'قيد المراجعة',            // تطابق القيمة الافتراضية في جدولك\n      created_at:   new Date().toISOString()\n    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function dbGetAll() {
  const { data, error } = await db
    .from('contributions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function dbUpdateStatus(id, status) {
  // تحديث حالة الطلب بناءً على اختيارات لوحة التحكم
  const { error } = await db
    .from('contributions')
    .update({ status: status })
    .eq('id', id);

  if (error) throw error;
}

async function dbUploadReceipt(file, id) {
  const ext = file.name.split('.').pop();
  const path = `receipts/${id}.${ext}`;\n\n  const { error } = await db.storage\n    .from('receipts')\n    .upload(path, file);\n\n  if (error) throw error;\n\n  const { data } = db.storage\n    .from('receipts')\n    .getPublicUrl(path);\n\n  return { url: data.publicUrl, name: file.name };\n}
