param(
  [Parameter(Mandatory = $true)] [string]$InstallerPath,
  [Parameter(Mandatory = $true)] [string]$JdkPath,
  [string]$SevenZipPath = 'C:\Program Files\7-Zip\7z.exe'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$build = Join-Path $projectRoot '.build'
$target = Join-Path $build 'tizen-6-cli'
$installer = (Resolve-Path -LiteralPath $InstallerPath).Path
$jdk = (Resolve-Path -LiteralPath $JdkPath).Path
$sevenZip = (Resolve-Path -LiteralPath $SevenZipPath).Path
if (-not (Test-Path -LiteralPath (Join-Path $jdk 'bin\java.exe') -PathType Leaf)) { throw 'JdkPath enthält kein bin\java.exe.' }
if ($jdk -notmatch '^[A-Za-z]:\\[A-Za-z0-9_.\\-]+$' -or $target -notmatch '^[A-Za-z]:\\[A-Za-z0-9_.\\-]+$') { throw 'JDK- und Projektpfad dürfen hier nur Buchstaben, Zahlen, Punkt, Unterstrich und Bindestrich enthalten; Leerzeichen und Shell-Sonderzeichen werden von der CLI nicht zuverlässig verarbeitet.' }
if ((Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash -ne 'B8C5A0C718B1F93127D9745A3E116418F9B6C0CA0531113AC983FD91EAAF2340') { throw 'Der Installer entspricht nicht dem geprüften Tizen-Studio-6.0-Web-CLI-Archiv.' }
if ((Get-AuthenticodeSignature -LiteralPath $installer).Status -ne 'Valid') { throw 'Die Windows-Signatur des Installers ist nicht gültig.' }
if (-not (Test-Path -LiteralPath $build)) { New-Item -ItemType Directory -Path $build | Out-Null }
if ((Get-Item -LiteralPath $build -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw '.build darf kein Verweis sein.' }
if (Test-Path -LiteralPath $target) { throw 'Das Ziel .build\tizen-6-cli existiert bereits und wird nicht überschrieben.' }

New-Item -ItemType Directory -Path $target | Out-Null
& $sevenZip x $installer "-o$target" 'tools\ide\*' 'library\sdk-utils-core.jar' -r -y
if ($LASTEXITCODE -ne 0) { throw 'Extraktion fehlgeschlagen; das Ziel muss vor einem erneuten Versuch geprüft werden.' }
if (-not (Test-Path -LiteralPath (Join-Path $target 'tools\ide\bin\tizen.bat') -PathType Leaf)) { throw 'Die extrahierte CLI fehlt.' }
$data = Join-Path $target 'data'
New-Item -ItemType Directory -Force -Path (Join-Path $data 'cli\logs') | Out-Null
@("TIZEN_SDK_INSTALLED_PATH=$target", "TIZEN_SDK_DATA_PATH=$data", "JDK_PATH=$jdk") | Set-Content -LiteralPath (Join-Path $target 'sdk.info') -Encoding ascii
Write-Host 'Isolierte CLI-Dateien vorbereitet. Dies installiert keine TV-Erweiterung und erstellt kein WGT.'
