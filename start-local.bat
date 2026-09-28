@echo off
echo ============================================
echo   SultiAI Localhost Startup
echo ============================================
echo.
echo   Port Map:
echo   -----------------------------------------
echo   Backend API:  http://localhost:3001
echo   Web:          http://localhost:3000
echo   Admin:        http://localhost:3002
echo   Expo:         http://localhost:8081
echo   -----------------------------------------
echo.
echo   NOTE: Metro (8081) proxies /api/* and /audio/* to 3001.
echo         The backend MUST be running or every API call returns 502.
echo.
echo Starting services...
echo.

echo [1/4] Starting Backend API on port 3001...
start "SultiAI Backend" cmd /c "cd /d %~dp0server && npx tsx src/index.ts"
timeout /t 6 >nul

echo [2/4] Starting Web on port 3000...
start "SultiAI Web" cmd /c "cd /d %~dp0web && npm run dev"
timeout /t 2 >nul

echo [3/4] Starting Admin on port 3002...
start "SultiAI Admin" cmd /c "cd /d %~dp0admin && npm run dev"
timeout /t 2 >nul

echo [4/4] Starting Expo on port 8081...
start "SultiAI Expo" cmd /c "cd /d %~dp0 && npx expo start"

echo.
echo ============================================
echo   All services starting!
echo.
echo   Backend API: http://localhost:3001
echo   Web:         http://localhost:3000
echo   Admin:       http://localhost:3002
echo   Expo:        http://localhost:8081
echo.
echo   Verify backend: curl http://localhost:3001/api/health
echo.
echo   Press any key to exit...
pause >nul
