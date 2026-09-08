$base = 'http://localhost:3002'
$endpointBase = 'https://mcp.figma.com/mcp/capture'

$pages = @(
  @{ name = '01 Login'; path = '/auth/login'; id = '5394c946-e2eb-4c9d-9bdd-2b90ee30d1ac' },
  @{ name = '02 Dashboard'; path = '/superadmin/dashboard'; id = 'e56bc45a-318e-4511-a2a8-c2a53d319966' },
  @{ name = '03 Universities'; path = '/superadmin/universities'; id = '3f30fd3e-29e8-4842-b791-861bd03e00d8' },
  @{ name = '04 Colleges'; path = '/superadmin/colleges'; id = 'a74113c3-abc8-4ecd-aff1-9004b8cb483a' },
  @{ name = '05 Platform Users'; path = '/superadmin/users'; id = '698a3b45-e5b1-4ee2-b74f-54a2f3b64f48' },
  @{ name = '06 Upload and Generate'; path = '/superadmin/content'; id = '094e9017-3e18-4d9c-a8d8-5fab7c283433' },
  @{ name = '07 Reports'; path = '/superadmin/reports'; id = 'cecc989a-9bb3-40b1-8604-0280101ada81' },
  @{ name = '08 Platform Health'; path = '/superadmin/health'; id = '94cf3613-800a-472f-91f3-99df626130c8' },
  @{ name = '09 Audit Logs'; path = '/superadmin/audit'; id = 'abc2e9ae-b5ec-4000-aa93-c55cd349a1df' },
  @{ name = '10 Notifications'; path = '/superadmin/notifications'; id = '946d1015-206d-48b6-8686-ef2745a3c860' },
  @{ name = '11 Settings'; path = '/superadmin/settings'; id = '43f5ddb7-cd21-4c33-b86f-2ea5a8530317' }
)

foreach ($p in $pages) {
  $submit = [uri]::EscapeDataString("$endpointBase/$($p.id)/submit?bindVariables=true")
  $hash = "figmacapture=$($p.id)&figmaendpoint=$submit&figmadelay=3500"
  $url = "$base$($p.path)#$hash"
  Write-Host "Opening $($p.name): $url"
  Start-Process $url
  Start-Sleep -Seconds 12
}

Write-Host 'All capture URLs opened. Poll Figma MCP for completion.'
