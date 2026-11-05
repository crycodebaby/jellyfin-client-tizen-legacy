# Tizen-Web-Build und private TV-Pakete

Für aktuelle Funktionen gilt der [Projektkontext](PROJECT_CONTEXT.md). Änderungen pro Version stehen im [Versionsverlauf](../CHANGELOG.md). Private Adressen, Gerätekennungen, Zertifikate, Protokolle und WGTs bleiben lokal.

## Quellstand und Nachweise

| Version | Web-Build | Installation und Start | Nutzerabnahme |
| --- | --- | --- | --- |
| 0.1.42 | 27 Laufzeitdateien geprüft, Autoren- und Distributor-Signatur des WGT kryptografisch validiert | Apps2Samsung bestätigte Update und Start auf dem ersten TV | Neuer Bedienstand ausstehend |
| 0.1.41 | Geprüft | Apps2Samsung bestätigte Installation und Start auf dem ersten TV | Fortsetzen nach Beenden und erneutem Öffnen bei einem Film bestätigt. Wiedergabeart nicht erfasst. |
| 0.1.39 | Geprüft | Apps2Samsung meldete den Stand auf dem zweiten TV | Einzelne frühere Nutzerprüfungen bleiben in der Historie nachvollziehbar. |

Frühere Geräteprüfungen bestätigten unter anderem Anmeldung, Wiedergabe mit Bild und Ton, grundlegende Sprünge, deutsche Tonspur bei einem Film, Sammlungen, Merkliste, QR-Kopplung und die Wiederaufnahme einer Connect-Verbindung im selben Handy-Tab. Die Einzelprüfungen belegen keine allgemeine Freigabe für andere Medien, Fernseher oder Netzwerkkonstellationen.

## Isolierte CLI und Web-Build

Voraussetzungen für den hier geprüften Windows-Weg sind Node.js, 7-Zip und ein vorhandenes JDK mit `bin\java.exe`. Die CLI stammt aus dem offiziellen [Tizen-Studio-6.0-Archiv](https://download.tizen.org/sdk/Installer/tizen-studio_6.0/). Das Vorbereitungsskript verifiziert Windows-Signatur und SHA-256 des geprüften Installers. Die vorhandene Studio-Installation bleibt getrennt. Projekt-, CLI- und JDK-Pfade dürfen bei diesem Batch-Weg keine Leerzeichen oder Shell-Sonderzeichen enthalten.

```powershell
# Einmalig, falls die isolierte CLI fehlt
& .\scripts\prepare-tizen-6-cli.ps1 `
  -InstallerPath '.\.build\tizen-studio-6.0-web-cli-installer.exe' `
  -JdkPath 'C:\tizen-studio\jdk'

# Nach den Tests ausführen. Beide Wege können .build/runtime neu erzeugen.
& .\scripts\build-web.ps1 -TizenCliPath '.\.build\tizen-6-cli\tools\ide\bin\tizen.bat'
```

Der Build vergleicht Dateiliste und SHA-256-Werte mit den vorgesehenen Laufzeitdateien. Das Ergebnis in `.build/runtime/.buildResult` ist der Eingang zur Paketierung. Bei der älteren lokalen CLI trat im Web-Builder ein Eclipse-Klassenfehler auf. Den geprüften isolierten Build bevorzugen.

## Paketierung und Geräteinstallation

1. Die **Dateien im** geprüften Build-Ordner als ZIP mit Endung `.wgt` unter `.build/tv-package/` paketieren. `config.xml` muss im Archiv auf oberster Ebene liegen. Paket- und App-ID beim Update beibehalten.
2. Falls nötig, eine bereits geprüfte private, editierbare Servervorgabe ausschließlich in der Paket-Arbeitskopie ergänzen. Keine Passwörter und Tokens ins Paket übernehmen. Der veröffentlichbare Quellstand bleibt neutral.
3. Ziel-TV im Entwicklermodus und über die Debugverbindung identifizieren. Apps2Samsung verwendet ein passendes Samsung-Zertifikat, signiert eine Kopie für die Installation und kann die App anschließend starten. Bei der Installation die bestehende App samt Daten erhalten.
4. Build, Paketinhalt, Ergebnis der Signierung, Installation, Start und Nutzerabnahme getrennt festhalten. Signaturdateien im Archiv allein beweisen weder die Gültigkeit der Zertifikatskette noch die Gerätekompatibilität.

```powershell
# Beispiel mit lokal vorhandener Apps2Samsung-CLI
& $apps2SamsungCli tv $tvAddress
& $apps2SamsungCli install $packagePath --tv $tvAddress --data-dir $privateSigningDirectory --launch
```

Die Eingabedatei der Apps2Samsung-CLI bleibt unverändert. Für ein separat aufbewahrtes signiertes WGT die signierte Kopie prüfen und privat ablegen. Das WGT kann Geräteinformationen enthalten. Den regulären Tizen-Paketierweg nur mit einem gültigen passenden Profil nutzen. Siehe [Samsung Certificate Manager](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html) und [Samsung CLI](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html).
