@echo off
echo ========================================
echo   Clearing Next.js Cache
echo ========================================
echo.

echo Stopping any running Next.js processes...
taskkill /F /IM node.exe 2>nul

echo.
echo Deleting .next folder...
if exist .next (
    rmdir /s /q .next
    echo .next folder deleted successfully!
) else (
    echo .next folder not found.
)

echo.
echo Deleting node_modules/.cache...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo node_modules/.cache deleted successfully!
) else (
    echo node_modules/.cache not found.
)

echo.
echo ========================================
echo   Cache cleared successfully!
echo   Now run: npm run dev
echo ========================================
pause
