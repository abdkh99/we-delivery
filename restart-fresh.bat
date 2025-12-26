@echo off
chcp 65001 >nul
echo ========================================
echo   🔄 إعادة تشغيل المشروع بدون Cache
echo ========================================
echo.

echo 1️⃣ إيقاف جميع عمليات Node.js...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo 2️⃣ حذف مجلد .next...
if exist .next (
    rmdir /s /q .next
    echo ✅ تم حذف .next بنجاح
) else (
    echo ⚠️ مجلد .next غير موجود
)

echo.
echo 3️⃣ حذف cache من node_modules...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo ✅ تم حذف node_modules\.cache بنجاح
) else (
    echo ⚠️ مجلد node_modules\.cache غير موجود
)

echo.
echo ========================================
echo   ✅ تم مسح الـ Cache بنجاح!
echo ========================================
echo.
echo الآن:
echo 1. افتح المتصفح في وضع Incognito (Ctrl+Shift+N)
echo 2. امسح cache المتصفح (Ctrl+Shift+Delete)
echo 3. شغل المشروع: npm run dev
echo 4. افتح: http://localhost:3000
echo.
echo ========================================
pause
