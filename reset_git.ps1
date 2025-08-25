# Stop any running Git processes
Get-Process | Where-Object { $_.ProcessName -like '*git*' -and $_.Id -ne $PID } | Stop-Process -Force -ErrorAction SilentlyContinue

# Remove lock file if it exists
$lockFile = ".git\index.lock"
if (Test-Path $lockFile) {
    Remove-Item -Path $lockFile -Force
    Write-Host "Removed Git lock file"
}

# Reset to the specified commit
git reset --hard e24867035354f0c1a6856536f9dd9586e6cc2802

# Verify the current commit
git rev-parse HEAD
