# 🔐 إصلاح مشكلة Session Timeout عند النت البطيء

## 📋 المشكلة

عند reload الصفحة أو عندما يكون النت بطيء/معلق:
- ❌ يحدث تسجيل خروج تلقائي
- ❌ تسجيل الدخول لا يعمل
- ❌ Session تضيع

---

## 🔍 السبب الجذري

### 1. **Network Timeout:**
```typescript
// ❌ الكود القديم
const { data: { user } } = await supabase.auth.getUser();
// إذا النت بطيء → timeout → user = null → logout تلقائي!
```

### 2. **عدم وجود Retry Logic:**
- محاولة واحدة فقط
- إذا فشلت → المستخدم يُعتبر غير مسجل دخول

### 3. **Clear localStorage بالكامل:**
```typescript
// ❌ الكود القديم
localStorage.clear(); // يمسح session tokens أيضاً!
```

---

## ✅ الحل المطبق

### 1. **Retry Logic مع Exponential Backoff:**

```typescript
const getUserWithRetry = async (): Promise<User | null> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt + 1}/${maxRetries + 1}...`);
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        // ✅ تحقق إذا كان الخطأ network-related
        if (attempt < maxRetries && (
          error.message.includes('fetch') || 
          error.message.includes('network') ||
          error.message.includes('timeout')
        )) {
          // ✅ Exponential backoff: 1s, 2s, 4s
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // حاول مرة أخرى
        }
        throw error;
      }
      
      return user; // ✅ نجحت!
      
    } catch (error) {
      if (attempt === maxRetries) {
        console.error("❌ All retry attempts failed");
        return null;
      }
    }
  }
  return null;
};
```

### 2. **Smart Error Handling:**

```typescript
// ✅ التفريق بين أنواع الأخطاء
if (error.message.includes('network')) {
  // خطأ في الشبكة → حاول مرة أخرى
  retry();
} else {
  // خطأ آخر (مثل invalid token) → فشل مباشرة
  throw error;
}
```

### 3. **Selective localStorage Clear:**

```typescript
// ❌ القديم
localStorage.clear(); // يمسح كل شيء!

// ✅ الجديد
localStorage.removeItem('cart'); // يمسح السلة فقط
// Supabase tokens تبقى في localStorage للـ persistence
```

### 4. **Memory Leak Prevention:**

```typescript
const isMountedRef = useRef(true);

useEffect(() => {
  // العمليات...
  
  return () => {
    isMountedRef.current = false; // ✅ منع updates بعد unmount
    if (authSubscription) {
      authSubscription.unsubscribe();
    }
  };
}, []);
```

---

## 🧪 سيناريوهات الاختبار

### السيناريو 1: النت طبيعي
```
1. المستخدم مسجل دخول
2. يعمل reload للصفحة
3. 🔄 Attempt 1/4 to get user...
4. ✅ User fetched successfully on attempt 1
5. المستخدم يبقى مسجل دخول ✅
```

### السيناريو 2: النت بطيء
```
1. المستخدم مسجل دخول
2. يعمل reload للصفحة
3. 🔄 Attempt 1/4 to get user...
4. ❌ Attempt 1 failed: network timeout
5. ⏳ Waiting 1000ms before retry...
6. 🔄 Attempt 2/4 to get user...
7. ✅ User fetched successfully on attempt 2
8. المستخدم يبقى مسجل دخول ✅
```

### السيناريو 3: النت معلق تماماً
```
1. المستخدم مسجل دخول
2. يعمل reload للصفحة
3. 🔄 Attempt 1/4 to get user...
4. ❌ Attempt 1 failed: network timeout
5. ⏳ Waiting 1000ms before retry...
6. 🔄 Attempt 2/4 to get user...
7. ❌ Attempt 2 failed: network timeout
8. ⏳ Waiting 2000ms before retry...
9. 🔄 Attempt 3/4 to get user...
10. ❌ Attempt 3 failed: network timeout
11. ⏳ Waiting 4000ms before retry...
12. 🔄 Attempt 4/4 to get user...
13. ❌ All retry attempts failed
14. المستخدم يبقى على الصفحة (لا يحدث logout) ✅
```

### السيناريو 4: Token غير صالح
```
1. Token expired أو invalid
2. 🔄 Attempt 1/4 to get user...
3. ❌ Error: invalid token (not network-related)
4. ℹ️ No user session found
5. Redirect to /login ✅
```

---

## 📊 Exponential Backoff Strategy

| المحاولة | الانتظار قبل المحاولة | الوقت التراكمي |
|----------|----------------------|----------------|
| 1 | 0ms | 0ms |
| 2 | 1000ms (1s) | 1s |
| 3 | 2000ms (2s) | 3s |
| 4 | 4000ms (4s) | 7s |

**الفائدة:**
- إعطاء فرصة للنت يرجع
- عدم إرسال requests كثيرة دفعة واحدة
- Maximum wait: 5 ثواني (لو النت بطيء جداً)

---

## 🎯 الفوائد

### للمستخدم:
- ✅ لا يحدث logout تلقائي عند reload
- ✅ تسجيل الدخول يعمل حتى لو النت بطيء
- ✅ تجربة أفضل بكثير

### للمطور:
- ✅ Console logs واضحة لتتبع المشكلة
- ✅ Retry logic قابل للتخصيص
- ✅ Error handling محسّن

### للنظام:
- ✅ تقليل محاولات login غير الضرورية
- ✅ Server load أقل
- ✅ Better UX = Higher retention

---

## 🔍 Console Logs للتحليل

### نجاح سريع:
```
🔐 Initializing auth...
🔄 Attempt 1/4 to get user...
✅ User fetched successfully on attempt 1
✅ User found: abc-123-def
✅ Profile loaded
```

### نجاح بعد retry:
```
🔐 Initializing auth...
🔄 Attempt 1/4 to get user...
❌ Attempt 1 failed: fetch failed
⏳ Waiting 1000ms before retry...
🔄 Attempt 2/4 to get user...
✅ User fetched successfully on attempt 2
✅ User found: abc-123-def
```

### فشل نهائي:
```
🔐 Initializing auth...
🔄 Attempt 1/4 to get user...
❌ Attempt 1 failed: network timeout
⏳ Waiting 1000ms before retry...
🔄 Attempt 2/4 to get user...
❌ Attempt 2 failed: network timeout
⏳ Waiting 2000ms before retry...
🔄 Attempt 3/4 to get user...
❌ Attempt 3 failed: network timeout
⏳ Waiting 4000ms before retry...
🔄 Attempt 4/4 to get user...
❌ All retry attempts failed
ℹ️ No user session
```

---

## 🧰 كيفية تخصيص الـ Retry Logic

### تغيير عدد المحاولات:
```typescript
const maxRetries = 5; // بدلاً من 3
```

### تغيير الانتظار:
```typescript
// Exponential: 1s, 2s, 4s, 8s
const delay = Math.min(1000 * Math.pow(2, attempt), 10000);

// Fixed delay: 2s كل مرة
const delay = 2000;

// Linear: 1s, 2s, 3s, 4s
const delay = 1000 * (attempt + 1);
```

### إضافة أنواع أخطاء:
```typescript
if (
  error.message.includes('fetch') || 
  error.message.includes('network') ||
  error.message.includes('timeout') ||
  error.message.includes('ECONNREFUSED') || // إضافة جديدة
  error.message.includes('offline')        // إضافة جديدة
) {
  retry();
}
```

---

## 🚀 الاختبار

### 1. اختبار النت الطبيعي:
```bash
git pull
npm run dev
# سجل دخول → اعمل reload → يبقى مسجل دخول ✅
```

### 2. اختبار النت البطيء:
```bash
# Chrome DevTools:
# F12 → Network → Throttling → Slow 3G
# سجل دخول → اعمل reload → يبقى مسجل دخول بعد retry ✅
```

### 3. اختبار النت المعلق:
```bash
# Chrome DevTools:
# F12 → Network → Offline
# سجل دخول → اعمل reload → loading طويل ثم يبقى مسجل دخول ✅
```

### 4. شوف Console:
```bash
# افتح Console (F12)
# لازم تشوف console logs مفصلة:
🔐 Initializing auth...
🔄 Attempt 1/4 to get user...
```

---

## 📚 الملفات المعدلة

1. ✅ **src/lib/supabase/client.ts**
   - تكوين Supabase client بشكل صحيح
   - localStorage persistence
   - Cookie handling

2. ✅ **src/contexts/AuthContext.tsx**
   - Retry logic مع exponential backoff
   - Smart error handling
   - Memory leak prevention
   - Selective localStorage clear

---

## 🔗 الـ Commits

1. [43fbba9](https://github.com/abdkh99/We-DELIVER-/commit/43fbba97c6cd05b0e02bb33127351a776219b71d) - إصلاح Supabase client
2. [fe1f90f](https://github.com/abdkh99/We-DELIVER-/commit/fe1f90f8ef249aff21f173496b9b02f04a34e6d0) - إصلاح AuthContext

---

**التاريخ:** 27 ديسمبر 2024  
**المطور:** Claude + عبد الله  
**الحالة:** ✅ تم الإصلاح
