@echo off
echo 正在清除 Vite 缓存...
if exist node_modules\.vite (
    rmdir /s /q node_modules\.vite
    echo Vite 缓存已清除
) else (
    echo 没有找到 Vite 缓存目录
)

echo.
echo 请重新启动开发服务器: npm run dev
pause
