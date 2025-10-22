@echo off
REM Check if this is a git repository
git rev-parse --is-inside-work-tree >nul 2>&1
IF ERRORLEVEL 1 (
    echo Not a Git repository.
    exit /b 1
)

REM Check for changes
git diff-index --quiet HEAD
IF %ERRORLEVEL% EQU 0 (
    echo No changes to commit.
    exit /b 0
)

REM Prompt for commit message
set /p msg=Commit message: 

REM Stage, commit, and push
git add .
git commit -m "%msg%"
git push

echo Changes committed and pushed successfully!
pause
