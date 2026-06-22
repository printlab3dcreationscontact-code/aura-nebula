@echo off
title Aura Nebula - Windows Installer Compiler
color 0b

echo ====================================================================
echo             AURA NEBULA - BUILDER D'INSTALLATEUR WINDOWS
echo ====================================================================
echo.
echo Ce script va assembler le code de votre application et compiler
echo un installateur Windows (.exe) autonome avec raccourci bureau.
echo.

REM Verify Node.js presence
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0c
    echo [ERREUR] Node.js n'est pas installe sur cette machine.
    echo Veuillez telecharger et installer Node.js depuis https://nodejs.org/ pour continuer.
    echo.
    pause
    exit /b
)

echo [1/3] Verification et installation des dependances...
if not exist node_modules (
    echo Dossier node_modules absent. Lancement de 'npm install'...
    call npm install
) else (
    echo Dependances deja presentes.
)
echo.

echo [2/3] Compilation du code source et de l'Aura Engine...
call npm run build
echo.

echo [3/3] Creation de l'installateur Windows executable (.exe)...
echo Cela peut prendre quelques dizaines de secondes...
call npm run electron:build
echo.

if %errorlevel% equ 0 (
    color 0a
    echo ====================================================================
    echo SUCCESS: L'INSTALLATEUR A ETE CREE AVEC SUCCES !
    echo ====================================================================
    echo.
    echo Vous trouverez le fichier d'installation (ex: "Aura Nebula Setup 1.0.0.exe")
    echo dans le dossier 'dist-desktop'. double-cliquez dessus pour l'installer.
    echo.
    echo Ouverture du dossier 'dist-desktop'...
    start dist-desktop
) else (
    color 0c
    echo ====================================================================
    echo ERREUR: La creation de l'installateur de bureau a echoue.
    echo ====================================================================
    echo Veuillez verifier que vous avez les droits de lecture/ecriture
    echo ou verifiez les logs ci-dessus.
)
echo.
pause
