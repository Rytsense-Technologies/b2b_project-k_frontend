# Opens the 7 core Super Admin routes for html.to.design capture.
# Target file: https://www.figma.com/design/42gIwLOZaEMZ29LHX7LYIn
#
# WORKFLOW (localhost — do NOT use Web tab URL import in Figma):
#   1. npm run dev  (single server on http://localhost:3000)
#   2. Log in as Super Admin in Chrome
#   3. Run this script to open each tab
#   4. Chrome extension -> Capture -> Save as .h2d (or Copy to clipboard)
#   5. Figma -> Plugins -> html.to.design -> Extension tab -> drop .h2d (or Ctrl+V on canvas)
#
# Do NOT inject capture.js into the Next.js app — it breaks CSS/layout.

param(
  [string]$Base = 'http://localhost:3000'
)

$pages = @(
  @{ name = '01 Dashboard'; path = '/superadmin/dashboard' },
  @{ name = '02 Universities'; path = '/superadmin/universities' },
  @{ name = '03 Colleges'; path = '/superadmin/colleges' },
  @{ name = '04 Platform Users'; path = '/superadmin/users' },
  @{ name = '05 Reports'; path = '/superadmin/reports' },
  @{ name = '06 Notifications'; path = '/superadmin/notifications' },
  @{ name = '07 Settings'; path = '/superadmin/settings' }
)

Write-Host 'Target: Quirri Super Admin - Core 7 Modules'
Write-Host 'https://www.figma.com/design/42gIwLOZaEMZ29LHX7LYIn'
Write-Host 'See docs/FIGMA_SUPER_ADMIN.md for import steps.'
Write-Host ''

foreach ($p in $pages) {
  $url = $Base + $p.path
  Write-Host ('Opening ' + $p.name + ': ' + $url)
  Start-Process $url
  Start-Sleep -Seconds 14
}

Write-Host ''
Write-Host 'Done. Capture each tab with html.to.design extension -> .h2d into Figma plugin Extension tab.'
