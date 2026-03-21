@echo off
setlocal enabledelayedexpansion
for /f "tokens=2 delims=:" %%a in ('sc query state^= all ^| findstr SERVICE_NAME ^| findstr MSSQL') do (
    set "svc=%%a"
    set "svc=!svc: =!"
    for /f "tokens=3 delims=: " %%p in ('sc queryex !svc! ^| findstr PID') do (
        echo !svc!: %%p
    )
)
