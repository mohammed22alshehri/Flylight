// ===== Supabase Secure Configuration =====
// This file uses PLACEHOLDER values that will be replaced by GitHub Actions
// with actual secrets from GitHub Secrets during deployment

let supabaseClient = null;

// Function to initialize Supabase safely
async function initSupabase() {
  if (supabaseClient) return supabaseClient;
  
  // These placeholders will be replaced by GitHub Actions workflow
  const SUPABASE_URL = 'PLACEHOLDER_SUPABASE_URL';
  const SUPABASE_ANON_KEY = 'PLACEHOLDER_SUPABASE_ANON_KEY';
  
  // Check if placeholders were replaced
  if (SUPABASE_URL.includes('PLACEHOLDER') || SUPABASE_ANON_KEY.includes('PLACEHOLDER')) {
    console.warn('⚠️ تحذير: مفاتيح Supabase لم يتم تحديثها. تأكد من إعدادات الـ GitHub Actions.');
    showToast('خطأ في الاتصال بقاعدة البيانات', 'error');
    return null;
  }
  
  // Create Supabase client with the provided keys
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Test connection
  try {
    const { error } = await supabaseClient.from('contributions').select('count()', { count: 'exact' }).limit(1);
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      showToast('لا يمكن الاتصال بقاعدة البيانات', 'error');
      return null;
    }
    console.log('✅ Supabase connected successfully');
    return supabaseClient;
  } catch (error) {
    console.error('Connection test error:', error);
    showToast('خطأ في اختبار الاتصال', 'error');
    return null;
  }
}

// ===== Database Operations =====

// Get all contributions
async function dbGetAllContributions() {
  const client = await initSupabase();
  if (!client) return [];
  
  try {
    const { data, error } = await client
      .from('contributions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching contributions:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Fetch error:', error);
    return [];
  }
}

// Insert new contribution (only pending, not approved)
async function dbInsertContribution(contribution) {
  const client = await initSupabase();
  if (!client) return null;
  
  try {
    const { data, error } = await client
      .from('contributions')
      .insert([{
        name: contribution.name,
        phone: contribution.phone,
        email: contribution.email,
        amount: contribution.amount,
        receipt_base64: contribution.receipt, // Store base64 receipt
        receipt_name: contribution.receiptName,
        notes: contribution.notes,
        status: 'قيد المراجعة', // Initially pending
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting contribution:', error);
      showToast('خطأ في حفظ المساهمة', 'error');
      return null;
    }
    
    console.log('✅ Contribution saved:', data);
    return data;
  } catch (error) {
    console.error('Insert error:', error);
    showToast('فشل حفظ البيانات', 'error');
    return null;
  }
}

// Update contribution status (approve or reject)
async function dbUpdateContributionStatus(id, newStatus) {
  const client = await initSupabase();
  if (!client) return false;
  
  try {
    // If rejecting, delete the contribution
    if (newStatus === 'مرفوض') {
      const { error } = await client
        .from('contributions')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting contribution:', error);
        showToast('خطأ في حذف المساهمة', 'error');
        return false;
      }
      
      console.log('✅ Contribution rejected and deleted');
      return true;
    }
    
    // If approving, update status
    const { error } = await client
      .from('contributions')
      .update({
        status: newStatus,
        review_date: new Date().toLocaleDateString('ar-SA'),
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating status:', error);
      showToast('خطأ في تحديث الحالة', 'error');
      return false;
    }
    
    console.log('✅ Contribution status updated to:', newStatus);
    return true;
  } catch (error) {
    console.error('Update error:', error);
    showToast('فشل تحديث الحالة', 'error');
    return false;
  }
}

// Get statistics
async function dbGetStatistics() {
  const client = await initSupabase();
  if (!client) return { total: 0, approved: 0, pending: 0 };
  
  try {
    const { data, error } = await client
      .from('contributions')
      .select('status, amount');
    
    if (error) {
      console.error('Error fetching statistics:', error);
      return { total: 0, approved: 0, pending: 0 };
    }
    
    const stats = {
      total: data?.length || 0,
      approved: data?.filter(c => c.status === 'تمت الموافقة').length || 0,
      pending: data?.filter(c => c.status === 'قيد المراجعة').length || 0,
      // IMPORTANT FIX: Only sum APPROVED contributions
      approvedAmount: data?.filter(c => c.status === 'تمت الموافقة').reduce((sum, c) => sum + (c.amount || 0), 0) || 0
    };
    
    return stats;
  } catch (error) {
    console.error('Statistics error:', error);
    return { total: 0, approved: 0, pending: 0 };
  }
}

// Verify data integrity
async function dbVerifyIntegrity() {
  const client = await initSupabase();
  if (!client) return false;
  
  try {
    // Test write
    const testData = {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+966500000000',
      amount: 50,
      status: 'اختبار'
    };
    
    const { data, error } = await client
      .from('contributions')
      .insert([testData])
      .select()
      .single();
    
    if (error) {
      console.error('Integrity check failed:', error);
      return false;
    }
    
    // Delete test data
    await client.from('contributions').delete().eq('id', data.id);
    
    console.log('✅ Database integrity verified');
    return true;
  } catch (error) {
    console.error('Integrity error:', error);
    return false;
  }
}

console.log('✅ Supabase configuration loaded');
