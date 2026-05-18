// ===== Supabase Configuration =====
// استبدل هذه القيم بقيم مشروعك من supabase.com
const SUPABASE_URL = 'SUPABASE_URL';
const SUPABASE_ANON_KEY = 'SUPABASE_KEY';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Database Operations =====

async function dbInsert(contribution) {
  const { data, error } = await db
    .from('contributions')
    .insert([{
      name:         contribution.name,
      phone:        contribution.phone,
      email:        contribution.email,
      amount:       contribution.amount,
      notes:        contribution.notes,
      receipt_url:  contribution.receipt_url,
      receipt_name: contribution.receipt_name,
      status:       'pending',
      created_at:   new Date().toISOString()
    }])
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
  const { error } = await db
    .from('contributions')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

async function dbUploadReceipt(file, id) {
  const ext = file.name.split('.').pop();
  const path = `receipts/${id}.${ext}`;

  const { error } = await db.storage
    .from('receipts')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = db.storage.from('receipts').getPublicUrl(path);
  return data.publicUrl;
}
