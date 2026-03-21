# ============================================================
# Grand Vietnam - Script bật TCP/IP và SQL Browser
# CHẠY với quyền Administrator (Right-click > Run as administrator)
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Grand Vietnam - SQL Server Setup      " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Bật SQL Server Browser
Write-Host "`n[1] Bật SQL Server Browser..." -ForegroundColor Yellow
try {
    Set-Service -Name "SQLBrowser" -StartupType Automatic
    Start-Service -Name "SQLBrowser"
    Write-Host "    OK: SQLBrowser đang chạy!" -ForegroundColor Green
} catch {
    Write-Host "    LOI: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Bật TCP/IP và gán Dynamic Port cho từng instance
$instances = @("MIENBAC", "MIENTRUNG", "MIENNAM")

foreach ($inst in $instances) {
    Write-Host "`n[2] Cấu hình TCP/IP cho instance: $inst" -ForegroundColor Yellow
    
    try {
        $wmi = Get-WmiObject -Namespace "root\Microsoft\SqlServer\ComputerManagement15" `
               -Class ServerNetworkProtocol `
               | Where-Object { $_.InstanceName -eq $inst -and $_.ProtocolName -eq "Tcp" }
        
        if ($wmi) {
            $wmi.SetEnable() | Out-Null
            Write-Host "    OK: Đã bật TCP/IP cho $inst" -ForegroundColor Green
        } else {
            Write-Host "    CANH BAO: Không tìm thấy instance $inst qua WMI" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "    LOI WMI: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Gán Dynamic Port (để SQL Server tự chọn port)
    try {
        $regPath = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL15.$inst\MSSQLServer\SuperSocketNetLib\Tcp\IPAll"
        Set-ItemProperty -Path $regPath -Name "TcpDynamicPorts" -Value "0" -ErrorAction Stop
        Set-ItemProperty -Path $regPath -Name "TcpPort" -Value "" -ErrorAction Stop
        Write-Host "    OK: Đã set Dynamic Port cho $inst" -ForegroundColor Green
    } catch {
        Write-Host "    LOI Registry: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Restart SQL Server instance
    Write-Host "    --> Đang restart SQL Server $inst..." -ForegroundColor Yellow
    try {
        $svcName = "MSSQL`$$inst"
        Restart-Service -Name $svcName -Force
        Write-Host "    OK: Đã restart $svcName" -ForegroundColor Green
    } catch {
        Write-Host "    LOI restart: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 3. Đọc port sau khi bật
Write-Host "`n[3] Kiểm tra TCP port sau cấu hình..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

foreach ($inst in $instances) {
    try {
        $regPath = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL15.$inst\MSSQLServer\SuperSocketNetLib\Tcp\IPAll"
        $tcpPort    = (Get-ItemProperty $regPath).TcpPort
        $dynPort    = (Get-ItemProperty $regPath).TcpDynamicPorts
        Write-Host "    $inst -> TcpPort='$tcpPort'  TcpDynamicPorts='$dynPort'" -ForegroundColor Cyan
    } catch {
        Write-Host "    Không đọc được registry cho $inst" -ForegroundColor Red
    }
}

Write-Host "`n========================================"
Write-Host "Hoàn thành! Giờ chạy lại: node index.js"
Write-Host "========================================`n" -ForegroundColor Green
