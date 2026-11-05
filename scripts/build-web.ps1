param(
  [Parameter(Mandatory = $true)]
  [string]$TizenCliPath
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$cli = (Resolve-Path -LiteralPath $TizenCliPath).Path
if ($projectRoot -notmatch '^[A-Za-z]:\\[A-Za-z0-9_.\\-]+$' -or $cli -notmatch '^[A-Za-z]:\\[A-Za-z0-9_.\\-]+$') {
  throw 'Projekt- und CLI-Pfad dürfen keine Leerzeichen oder Shell-Sonderzeichen enthalten.'
}
if (-not (Test-Path -LiteralPath $cli -PathType Leaf) -or [IO.Path]::GetFileName($cli) -ne 'tizen.bat') {
  throw 'TizenCliPath muss auf eine vorhandene tizen.bat zeigen.'
}
$sdkRoot = (Get-Item -LiteralPath (Split-Path -Parent $cli)).Parent.Parent.Parent.FullName
$sdkInfo = Join-Path $sdkRoot 'sdk.info'
if (-not (Test-Path -LiteralPath $sdkInfo -PathType Leaf)) { throw 'Die SDK-Konfiguration neben der CLI fehlt.' }
$sdkValues = @{}
foreach ($line in Get-Content -LiteralPath $sdkInfo) {
  if ($line -match '^(TIZEN_SDK_INSTALLED_PATH|TIZEN_SDK_DATA_PATH|JDK_PATH)=(.*)$') {
    $key = $Matches[1]; $value = $Matches[2]
    if ($sdkValues.ContainsKey($key) -or $value -notmatch '^[A-Za-z]:\\[A-Za-z0-9_.\\-]+$') { throw 'Die SDK-Konfiguration enthält einen doppelten, leeren oder ungültigen Pfad.' }
    $sdkValues[$key] = [IO.Path]::GetFullPath($value).TrimEnd('\')
  } elseif ($line.Trim()) { throw 'Unerwarteter Eintrag in der SDK-Konfiguration.' }
}
foreach ($key in @('TIZEN_SDK_INSTALLED_PATH', 'TIZEN_SDK_DATA_PATH', 'JDK_PATH')) {
  if (-not $sdkValues.ContainsKey($key)) { throw "SDK-Konfiguration unvollständig: $key fehlt." }
}
if ($sdkValues['TIZEN_SDK_INSTALLED_PATH'] -ine $sdkRoot.TrimEnd('\') -or -not $sdkValues['TIZEN_SDK_DATA_PATH'].StartsWith($sdkRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) {
  throw 'SDK- und Datenpfad müssen zur isolierten CLI gehören.'
}
if (-not (Test-Path -LiteralPath (Join-Path $sdkValues['JDK_PATH'] 'bin\java.exe') -PathType Leaf)) { throw 'Das konfigurierte JDK ist nicht verfügbar.' }
$environmentNames = @('TIZEN_HOME', 'JAVA_TOOL_OPTIONS', '_JAVA_OPTIONS', 'JDK_JAVA_OPTIONS')
$previousEnvironment = @{}
foreach ($name in $environmentNames) { $previousEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }

Push-Location $projectRoot
try {
  [Environment]::SetEnvironmentVariable('TIZEN_HOME', $sdkRoot, 'Process')
  foreach ($name in $environmentNames | Where-Object { $_ -ne 'TIZEN_HOME' }) { [Environment]::SetEnvironmentVariable($name, $null, 'Process') }
  & npm.cmd run check
  if ($LASTEXITCODE -ne 0) { throw 'Projektprüfung fehlgeschlagen.' }
  & npm.cmd run prepare:tizen
  if ($LASTEXITCODE -ne 0) { throw 'Laufzeitvorbereitung fehlgeschlagen.' }
  & $cli build-web -- (Join-Path $projectRoot '.build\runtime')
  if ($LASTEXITCODE -ne 0) { throw 'Tizen-Web-Build fehlgeschlagen.' }
  & node (Join-Path $PSScriptRoot 'verify-web-build.cjs')
  if ($LASTEXITCODE -ne 0) { throw 'Prüfung des Build-Ergebnisses fehlgeschlagen.' }
} finally {
  foreach ($name in $environmentNames) { [Environment]::SetEnvironmentVariable($name, $previousEnvironment[$name], 'Process') }
  Pop-Location
}
