param(
  [Parameter(Mandatory = $true)][string]$ServerAddress,
  [string]$Python = $env:SMAIRYS_QR_PYTHON
)
$ErrorActionPreference = 'Stop'
$uri = $null
if (-not [Uri]::TryCreate($ServerAddress, [UriKind]::Absolute, [ref]$uri) -or $uri.Scheme -ne 'http') { throw 'Bitte eine lokale HTTP-Jellyfin-Adresse angeben.' }
$localAddress = $null
if (-not [System.Net.IPAddress]::TryParse($uri.Host, [ref]$localAddress) -or $localAddress.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork -or [System.Net.IPAddress]::IsLoopback($localAddress)) { throw 'Bitte die lokale IPv4-Adresse des Computers verwenden.' }
if (-not (Get-NetIPAddress -AddressFamily IPv4 -IPAddress $localAddress.IPAddressToString -ErrorAction SilentlyContinue)) { throw 'Die angegebene Adresse gehört nicht zu diesem Computer.' }
$node = (Get-Command node -ErrorAction Stop).Source
if (-not $Python) {
  $bundled = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
  if (Test-Path -LiteralPath $bundled) { $Python = $bundled }
  else { $Python = (Get-Command python -ErrorAction Stop).Source }
}
if (-not (Test-Path -LiteralPath $Python)) { throw 'Python wurde nicht gefunden.' }
& $Python -c 'import reportlab.graphics.barcode.qr' 2>$null
if ($LASTEXITCODE -ne 0) { throw 'Die lokale QR-Bibliothek ReportLab ist nicht verfügbar.' }
$relay = Join-Path (Split-Path $PSScriptRoot -Parent) 'companion\relay.cjs'
$clipConfig = Join-Path (Split-Path $PSScriptRoot -Parent) '.private\clip-settings.local.json'
$previous = $env:SMAIRYS_QR_PYTHON
$previousClipConfig = $env:SMAIRYS_CLIP_CONFIG
try {
  $env:SMAIRYS_QR_PYTHON = $Python
  if (Test-Path -LiteralPath $clipConfig -PathType Leaf) { $env:SMAIRYS_CLIP_CONFIG = $clipConfig }
  $process = Start-Process -FilePath $node -ArgumentList @(('"' + $relay + '"'), $localAddress.IPAddressToString, '8787') -WorkingDirectory (Split-Path $PSScriptRoot -Parent) -WindowStyle Hidden -PassThru
} finally { $env:SMAIRYS_QR_PYTHON = $previous; $env:SMAIRYS_CLIP_CONFIG = $previousClipConfig }
Start-Sleep -Milliseconds 400
$process.Refresh()
if ($process.HasExited) { throw 'Der Begleitdienst konnte nicht gestartet werden. Prüfe, ob Port 8787 bereits belegt ist.' }
Write-Output 'Handy-Begleitdienst gestartet.'
