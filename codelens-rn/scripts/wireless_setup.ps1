# CodeLens Wireless Dev Setup
# Run as Administrator (needed for firewall rules).
# Run once to pair, then use to reconnect anytime.

Write-Host "--- CodeLens Wireless Dev Setup ---" -ForegroundColor Cyan
Write-Host "Make sure your phone and PC are on the same Wi-Fi."

# 1. Kill any stale Metro/Node processes on 8081 and 8082
Write-Host "Clearing stale Metro processes..." -ForegroundColor Yellow
foreach ($port in @(8081, 8082)) {
    $pid_ = (netstat -ano | Select-String ":$port " | Select-String "LISTENING") -replace '.*\s+(\d+)$','$1' | Select-Object -First 1
    if ($pid_) {
        Stop-Process -Id $pid_ -Force -ErrorAction SilentlyContinue
        Write-Host "  Killed process on port $port (PID $pid_)" -ForegroundColor Gray
    }
}

# 2. Firewall — open ports 8081 and 8082
foreach ($port in @(8081, 8082)) {
    $fwRule = netsh advfirewall firewall show rule name="Metro $port" 2>&1
    if ($fwRule -match "Keine Regeln|No rules") {
        netsh advfirewall firewall add rule name="Metro $port" dir=in action=allow protocol=TCP localport=$port | Out-Null
        Write-Host "Firewall port $port opened." -ForegroundColor Green
    } else {
        Write-Host "Firewall port $port already open." -ForegroundColor Green
    }
}

# 3. Optionally pair a new device
$choice = Read-Host "Do you need to PAIR a new device? (y/n)"
if ($choice -eq "y") {
    $pairIpPort = Read-Host "Enter Pairing IP:Port (from 'Pair device with pairing code')"
    $pairCode = Read-Host "Enter 6-digit Pairing Code"
    Write-Host "Pairing..." -ForegroundColor Yellow
    adb pair $pairIpPort $pairCode
}

# 4. Connect
$connectIpPort = Read-Host "Enter Wireless Debugging IP:Port (shown on phone under Developer Options > Wireless Debugging)"
Write-Host "Connecting to $connectIpPort..." -ForegroundColor Yellow
adb connect $connectIpPort
adb devices

# 5. Start Metro on 8081 in a new window
Write-Host "Starting Metro bundler..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\CodeLens-v2\codelens-rn'; npx expo start --dev-client --port 8081"
Write-Host "Waiting for Metro to start..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# 6. Detect which port Metro is actually on
$metroPort = $null
foreach ($port in @(8081, 8082)) {
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:$port/status" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($resp.Content -match "running") { $metroPort = $port; break }
    } catch {}
}
if (-not $metroPort) { $metroPort = 8081 }
Write-Host "Metro detected on port $metroPort" -ForegroundColor Cyan

# 7. Reverse tunnel on the correct port
adb -s $connectIpPort reverse tcp:$metroPort tcp:$metroPort
Write-Host "Reverse tunnel set on port $metroPort" -ForegroundColor Green

# 8. Launch CodeLens
$encodedPort = $metroPort
Write-Host "Launching CodeLens..." -ForegroundColor Green
adb -s $connectIpPort shell am force-stop com.anonymous.codelensrn
Start-Sleep -Seconds 2
$url = "codelensrn://expo-development-client/?url=http%3A%2F%2Flocalhost%3A$encodedPort"
adb -s $connectIpPort shell am start -a android.intent.action.VIEW -d $url

Write-Host "`nDone! App should load in ~30 seconds." -ForegroundColor Green
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
