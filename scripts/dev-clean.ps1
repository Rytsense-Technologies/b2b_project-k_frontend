param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

Write-Host "Checking port $Port..." -ForegroundColor Cyan

$listenEntries = netstat -ano | Select-String ":$Port "
$pids = @()

foreach ($entry in $listenEntries) {
  $parts = ($entry -replace "^\s+", "") -split "\s+"
  if ($parts.Length -ge 5 -and $parts[3] -eq "LISTENING") {
    $procId = $parts[4]
    if ($procId -match "^\d+$" -and $procId -ne "0") {
      $pids += [int]$procId
    }
  }
}

$pids = $pids | Select-Object -Unique

if ($pids.Count -gt 0) {
  Write-Host "Port $Port is in use by PID(s): $($pids -join ', ')" -ForegroundColor Yellow
foreach ($procId in $pids) {
    try {
      taskkill /PID $procId /F | Out-Null
      Write-Host "Killed PID $procId" -ForegroundColor Green
    } catch {
      Write-Host "Failed to kill PID ${procId}: $($_.Exception.Message)" -ForegroundColor Red
    }
  }
  Start-Sleep -Milliseconds 400
} else {
  Write-Host "Port $Port is free." -ForegroundColor Green
}

Write-Host "Starting Next.js dev server on port $Port..." -ForegroundColor Cyan
npx next dev -p $Port
