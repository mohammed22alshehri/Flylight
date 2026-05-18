// ===== Supabase Safe Configuration =====
// هذه الكلمات المفتاحية سيقوم الـ Workflow باستبدالها تلقائياً بالقيم الحقيقية أثناء النشر
const getClient = () => {
  const url = 'VITE_SUPABASE_URL';
  const key = 'VITE_SUPABASE_KEY';
  
  if (!url || !key || url.includes('VITE_SUPABASE_URL')) {
    throw new Error("تنبيه: مفاتيح الاتصال الآمنة غائبة عن بيئة التشغيل الحالية.");
  }
  return supabase.createClient(url, key);
};


// ===== Database Operations =====

async function dbInsert(contribution) {
  try {
    const db = getClient();
    const { data, error } = await db
      .from('contributions')
      .insert([{
        name:         contribution.name,
        phone:        contribution.phone,
        email:        contribution.email,
        amount:       contribution.amount,
        notes:        contribution.notes,
        receipt:      contribution.receipt_url, 
        receipt_name: contribution.receipt_name,
        status:       'قيد المراجعة',
        created_at:   new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("خطأ في dbInsert:", err);
    throw new Error("فشل حفظ البيانات: " + err.message);
  }
}

async function dbGetAll() {
  try {
    const db = getClient();
    const { data, error } = await db
      .from('contributions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("خطأ في dbGetAll:", err);
    return [];
  }
}

async function dbUpdateStatus(id, status) {
  try {
    const db = getClient();
    const { error } = await db
      .from('contributions')
      .update({ status: status })
      .eq('id', id);

    if (error) throw error;
  } catch (err) {
    console.error("خطأ في dbUpdateStatus:", err);
    throw err;
  }
}

async function dbUploadReceipt(file, id) {
  try {
    const db = getClient();
    const ext = file.name.split('.').pop();
    const path = `receipts/${id}.${ext}`;

    const { error } = await db.storage
      .from('receipts')
      .upload(path, file);

    if (error) throw error;

    const { data } = db.storage
      .from('receipts')
      .getPublicUrl(path);

    return { url: data.publicUrl, name: file.name };
  } catch (err) {
    console.error("خطأ في dbUploadReceipt:", err);
    throw new Error("حدث مشكلة أثناء رفع ملف الإيصال: " + err.message);
  }
}
