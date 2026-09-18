@echo off
echo ============================================
echo   SultiAI Localhost Startup
echo ============================================
echo.
echo   Port Map:
echo   -----------------------------------------
echo   Node Gateway: http://localhost:3000
echo   Web:          http://localhost:3001
echo   Admin:        http://localhost:3002
echo   AI Service:   http://localhost:8001
echo   Expo:         http://localhost:8081
echo   -----------------------------------------
echo.
echo Starting services...
echo.

echo [1/5] Starting AI Service on port 8001...
start "SultiAI AI Service" cmd /c "cd /d %~dp0ai-service && .venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload"
timeout /t 5 >nul

echo [2/5] Starting Node Gateway on port 3000...
start "SultiAI Server" cmd /c "cd /d %~dp0server && node index.js"
timeout /t 3 >nul

echo [3/5] Starting Web on port 3001...
start "SultiAI Web" cmd /c "cd /d %~dp0web && npm run dev"
timeout /t 2 >nul

echo [4/5] Starting Admin on port 3002...
start "SultiAI Admin" cmd /c "cd /d %~dp0admin && npm run dev"
timeout /t 2 >nul

echo [5/5] Starting Expo on port 8081...
start "SultiAI Expo" cmd /c "cd /d %~dp0 && npx expo start"

echo.
echo ============================================
echo   All services starting!
echo ============================================
echo.
echo   Node Gateway: http://localhost:3000
echo   AI Service:   http://localhost:8001
echo   Web:          http://localhost:3001
echo   Admin:        http://localhost:3002
echo   Expo:         http://localhost:8081
echo.
echo   Press any key to exit...
pause >nul