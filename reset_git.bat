@echo off
echo Attempting to reset Git repository...

echo Stopping any running Git processes...
taskkill /IM git.exe /F /T >nul 2>&1

echo Removing Git lock files...
del /F /Q ".git\index.lock" 2>nul

echo Resetting to commit e24867035354f0c1a6856536f9dd9586e6cc2802...
"C:\Program Files\Git\cmd\git.exe" reset --hard e24867035354f0c1a6856536f9dd9586e6cc2802

echo Current HEAD:
"C:\Program Files\Git\cmd\git.exe" rev-parse HEAD

echo Done.
pause
