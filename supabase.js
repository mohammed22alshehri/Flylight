// ===== Supabase Configuration =====
// Load from environment variables (never hardcode keys!)
// Frontend only has access to ANON key (RLS protected)
// Service role key stays server-side only

let supabaseClient = null;

// Function to initialize Supabase
async function initSupabase() {
  if (supabaseClient) return supabaseClient;

  // ⚠️ الـ ANON Key آمنة للعرض هنا (Supabase صممتها كذا)
  // الحماية الحقيقية تأتي من RLS Policies في قاعدة البيانات
  // شغّل ملف SECURE_DATABASE.sql في Supabase لتفعيل الحماية
  const SUPABASE_URL = 'https://cqvgwndejcqheojsanlk.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_0_Zgt0LPralL3mkOQ7pqiA_0-SIYLDS';
  
  // Create Supabase client
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Test connection
  try {
    const { error } = await supabaseClient.from('contributions').select('id').limit(1);
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

// Get all contributions (محمي — يتطلب كلمة سر الإدارة المخزّنة في session)
async function dbGetAllContributions() {
  const client = await initSupabase();
  if (!client) return [];

  // الحصول على كلمة السر من الجلسة الحالية
  const adminPassword = sessionStorage.getItem('adminPasswordTemp');
  if (!adminPassword) {
    console.warn('No admin password in session');
    return [];
  }

  try {
    // استخدام RPC function الآمنة بدلاً من القراءة المباشرة
    const { data, error } = await client.rpc('get_all_contributions_admin', {
      admin_password: adminPassword
    });

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

// Insert new contribution
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
        receipt: contribution.receipt,
        receipt_name: contribution.receiptName,
        notes: contribution.notes,
        status: 'قيد المراجعة',
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

// Update contribution status (محمي عبر RPC functions)
async function dbUpdateContributionStatus(id, newStatus) {
  const client = await initSupabase();
  if (!client) return false;

  const adminPassword = sessionStorage.getItem('adminPasswordTemp');
  if (!adminPassword) {
    showToast('يجب تسجيل الدخول كإدارة', 'error');
    return false;
  }

  try {
    // الرفض → استخدام RPC الآمنة
    if (newStatus === 'مرفوض') {
      const { data, error } = await client.rpc('reject_contribution_admin', {
        p_contribution_id: id,
        admin_password: adminPassword
      });

      if (error) {
        console.error('Reject error:', error);
        showToast('خطأ في رفض المساهمة', 'error');
        return false;
      }

      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) {
        showToast(result?.message || 'فشل الرفض', 'error');
        return false;
      }
      return true;
    }

    // الموافقة → استخدام RPC الآمنة (تُصدر الشهادات تلقائياً)
    const { data, error } = await client.rpc('approve_contribution_admin', {
      p_contribution_id: id,
      admin_password: adminPassword
    });

    if (error) {
      console.error('Approve error:', error);
      showToast('خطأ في الموافقة', 'error');
      return false;
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.success) {
      showToast(result?.message || 'فشلت الموافقة', 'error');
      return false;
    }

    // حفظ عدد الشهادات المُصدرة للاستخدام في dashboard.js
    window._lastApprovalCertCount = result?.cert_count || 0;
    return true;
  } catch (error) {
    console.error('Update error:', error);
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
    
    if (error) return { total: 0, approved: 0, pending: 0 };
    
    return {
      total: data?.length || 0,
      approved: data?.filter(c => c.status === 'تمت الموافقة').length || 0,
      pending: data?.filter(c => c.status === 'قيد المراجعة').length || 0,
      approvedAmount: data?.filter(c => c.status === 'تمت الموافقة')
        .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0) || 0
    };
  } catch (error) {
    return { total: 0, approved: 0, pending: 0 };
  }
}

// ===== Certificates =====

// إصدار شهادات لمساهمة معتمدة (يستدعي دالة SQL الآمنة)
// يُعيد عدد الشهادات المُصدَرة، أو 0 إذا كانت موجودة مسبقاً
async function dbIssueCertificates(contributionId) {
  const client = await initSupabase();
  if (!client) return 0;

  try {
    const { data, error } = await client.rpc('issue_certificates', {
      p_contribution_id: contributionId
    });

    if (error) {
      console.error('Error issuing certificates:', error);
      // الدالة غير موجودة → لم يُشغَّل certificates_setup.sql بعد
      if (error.code === 'PGRST202') {
        showToast('شغّل ملف certificates_setup.sql في Supabase أولاً', 'error');
      }
      return 0;
    }

    console.log(`✅ Issued ${data} certificate(s) for contribution ${contributionId}`);
    return data || 0;
  } catch (err) {
    console.error('dbIssueCertificates error:', err);
    return 0;
  }
}

// جلب شهادات مساهمة معينة مرتبة حسب الرقم التسلسلي
async function dbGetCertificates(contributionId) {
  const client = await initSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('certificates')
      .select('*')
      .eq('contribution_id', contributionId)
      .order('serial_no', { ascending: true });

    if (error) {
      console.error('Error fetching certificates:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('dbGetCertificates error:', err);
    return [];
  }
}

// ===== Admin Authentication (server-side) =====
// التحقق من كلمة سر الإدارة داخل خادم Supabase عبر دالة RPC آمنة.
// كلمة السر (وقيمتها المشفّرة) لا تصل إلى المتصفح إطلاقاً.
async function dbVerifyAdminPassword(password) {
  const client = await initSupabase();
  if (!client) {
    showToast('لا يمكن الاتصال بقاعدة البيانات', 'error');
    return false;
  }

  try {
    const { data, error } = await client.rpc('verify_admin_password', {
      input_password: password
    });

    if (error) {
      console.error('Admin verification error:', error.code, '-', error.message);
      // الدالة غير موجودة في Supabase بعد (لم يُشغّل admin_setup.sql)
      if (error.code === 'PGRST202') {
        showToast('لم يتم إعداد التحقق في Supabase بعد — شغّل ملف admin_setup.sql', 'error');
      } else {
        showToast('تعذّر التحقق من كلمة المرور', 'error');
      }
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Admin verification exception:', error);
    return false;
  }
}

console.log('✅ Supabase configuration loaded');
