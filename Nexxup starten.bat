@echo off
rem ==========================================================
rem  Nexxup starten (Windows): Doppelklick genuegt.
rem  Holt den neuesten Stand von GitHub, installiert Pakete
rem  und startet die App unter http://localhost:9100
rem  Beenden: im schwarzen Fenster Strg + C druecken.
rem ==========================================================

rem Zweig mit dem aktuellen Stand (Hauptzweig).
set BRANCH=main

title Nexxup
cd /d "%~dp0"

if not exist ".env" (
  echo.
  echo [Hinweis] Die Datei .env fehlt in diesem Ordner.
  echo Die App startet, aber Anmelden funktioniert ohne sie nicht.
  echo.
)

echo [1/3] Neuesten Stand holen ...
git fetch origin
if errorlevel 1 goto gitfail
git checkout %BRANCH%
if errorlevel 1 goto gitfail
git pull
if errorlevel 1 goto gitfail

echo.
echo [2/3] Pakete installieren ...
call npm.cmd install
if errorlevel 1 goto npmfail

echo.
echo [3/3] App starten ... (Browser: http://localhost:9100)
call npm.cmd run dev
goto end

:gitfail
echo.
echo [Fehler] Der neueste Stand konnte nicht geholt werden.
echo Moegliche Ursachen: kein Internet, oder lokale Aenderungen im Projektordner.
echo Bitte einen Screenshot dieses Fensters an Claude schicken.
pause
goto end

:npmfail
echo.
echo [Fehler] Die Pakete konnten nicht installiert werden.
echo Bitte einen Screenshot dieses Fensters an Claude schicken.
pause

:end
