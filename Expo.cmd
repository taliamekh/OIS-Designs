@echo off
setlocal
pushd "%~dp0mobile" || exit /b 1

set "OIS_NODE=node.exe"
where.exe node.exe >nul 2>&1
if errorlevel 1 (
  set "OIS_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"
)

if not exist "node_modules\expo\bin\cli" (
  echo Project dependencies are missing. Install Node.js LTS, then run npm ci inside mobile.
  popd
  pause
  exit /b 1
)

if "%~1"=="" (
  "%OIS_NODE%" "node_modules\expo\bin\cli" start --go
) else (
  "%OIS_NODE%" "node_modules\expo\bin\cli" %*
)
set "OIS_EXPO_EXIT=%ERRORLEVEL%"
popd
if not "%OIS_EXPO_EXIT%"=="0" pause
exit /b %OIS_EXPO_EXIT%
