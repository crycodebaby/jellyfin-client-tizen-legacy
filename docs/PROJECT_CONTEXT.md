# Projektkontext

Dieser kompakte technische Kontext richtet sich an Mitwirkende und Agenten. Neue Beobachtungen vor der Übernahme prüfen und den Aufgabenstand in `TASKS.md` aktualisieren.

## Produkt und Zielgerät

- **Name:** Smairys Mediathek; **Slogan:** „deine freie Kinoerfahrung“.
- **Ziel:** ein ruhiger, schneller Jellyfin-Client für die Fernbedienung eines Samsung-Fernsehers von 2016.
- **Prioritäten:** sichtbarer Fokus, vorhersehbare Steuerung, lesbare 1080p-Oberfläche und geringe Ressourcenlast.

| Eigenschaft | Projektwert |
| --- | --- |
| Fernseher | Samsung UE65KU6099UXZG, Modelljahr 2016 |
| System und WebEngine | Tizen 2.4.0, WebKit r152340 |
| App-Typ | Tizen Web Application, `.wgt` |
| Jellyfin | Version 12.3.0 beobachtet; privater Servername und Adresse nicht veröffentlicht |
| Tizen Studio | Entwicklungsinstallation unter `C:\tizen-studio` |

PC-, TV- und Serveradressen sind private Entwicklungsdaten. Das Serverfeld der App ist editierbar und enthält keine private Vorgabe.

## Architektur und Datenfluss

- Statische Web-App mit `index.html`, `styles.css`, `app.js` und `config.xml`; keine Frameworks, Bundler oder externen Laufzeitdienste.
- JavaScript bleibt ES5-kompatibel, solange neuere Funktionen auf dem Ziel-TV nicht nachgewiesen sind.
- Jellyfin ist die einzige Quelle für Benutzer, Bibliotheken, Metadaten, Bilder, Medien und Wiedergabestatus.
- Die auf Nutzerwunsch vorgezogene Oberfläche zeigt gekennzeichnete fiktive Beispieltitel. Suche und Merkliste verwenden nur diese Daten; die Merkliste lebt nur während der Sitzung.
- Der Verbindungsdialog fragt ohne Anmeldung `GET /System/Info/Public` ab. Authentifizierung und Bibliotheks-API sind noch nicht implementiert.
- Samsung-TV-Web-Apps werden als WGT paketiert. Die aktuelle Deklaration `required_version="2.3"` folgt Samsungs Kompatibilitätshinweis für Geräte ab 2015; der Lauf auf dem Zielgerät ist nicht bewiesen.

## Dateien

| Pfad | Aufgabe |
| --- | --- |
| `index.html` | Seitenleiste, Vorschauansichten sowie Detail- und Verbindungsdialog |
| `styles.css` | 1920×1080-Layout und Fokusgestaltung |
| `app.js` | Fokusnavigation, Beispieldaten, temporäre Merkliste und HTTP-Prüfung |
| `assets/` | Eigene schlanke SVG-Grafiken für Hero und Beispieltitel |
| `config.xml` | Tizen-App-ID, Profil, Mindestversion, Netzwerkfreigabe und Icon |
| `branding/` | Austauschbare Markenbilder; siehe `branding/README.md` |
| `scripts/`, `tests/` | Lokale Vorschau, Paketvorbereitung und Desktop-Prüfungen; keine TV-Laufzeitabhängigkeiten |
| `.github/workflows/` | Prüfungen bei eigenem Push oder manueller Auslösung |
| `AGENTS.md`, `CLAUDE.md` | Gemeinsamer und Claude-spezifischer Agent-Einstieg |
| `TASKS.md` | Aufgaben, Prüfstand und Blocker |

## Lokale Vorschau und Quellprüfung

```powershell
npm run preview
```

Danach `http://127.0.0.1:8000` öffnen. Die Desktop-Vorschau ersetzt keinen Test mit TV-WebKit oder nativen TV-APIs. Pfeiltasten, Enter und Escape bilden die Fernbedienung ab.

```powershell
npm ci
npx playwright install --only-shell chromium
npm test
```

Vorgesehener Paketbau nach SDK-Reparatur und Einrichtung eines gültigen TV-Profils. Die Laufzeitvorbereitung kopiert nur explizit erlaubte App-Dateien nach `.build/runtime` und lässt Tests, Arbeitsdateien und private Konfiguration aus:

```powershell
$tizen = 'C:\tizen-studio\tools\ide\bin\tizen.bat'
npm run prepare:tizen
& $tizen build-web -- .\.build\runtime
& $tizen package -t wgt -s '<TV-ZERTIFIKATSPROFIL>' -- .\.build\runtime\.buildResult
```

Keine Signaturschlüssel, Passwörter oder Tokens in Git aufnehmen.

## Aktueller technischer Stand

Am 27.10.2026 meldete der installierte Tizen CLI Version 2.5.25. `build-web` erreichte 80 % und scheiterte mit:

```text
NoClassDefFoundError: org/eclipse/core/runtime/Plugin
```

Die zugehörige Eclipse-Core-Runtime-JAR wurde in `C:\tizen-studio\tools\ide\lib-ncli` nicht gefunden. Sichtbare Plattformordner sind Tizen 6.0, 6.5, 7.0, 8.0 und 9.0. Im geprüften gemeinsamen Vorlagenordner lag nur `rpk_template`; Samsung-TV-Vorlagen und Extension waren nicht sichtbar. Unter `C:\tizen-studio-data\ide\keystore\profiles.xml` wurde keine Profildatei gefunden.

Es gibt daher noch kein WGT und keine Installation oder Laufzeitprüfung auf dem Fernseher. Die Web CLI und Samsung TV Extension müssen repariert beziehungsweise installiert und ein gültiges TV-Signaturprofil gefunden oder eingerichtet werden. Die Paketierung aus dem vorbereiteten Laufzeitordner ist ebenfalls noch nicht mit Tizen CLI bestätigt.

## TV-Test vorbereiten

1. PC und TV ins gleiche LAN bringen.
2. Developer Mode am TV aktivieren und die aktuelle PC-LAN-IP eintragen.
3. Mit `C:\tizen-studio\tools\sdb.exe devices` prüfen, ob das Gerät erscheint.
4. Im Device Manager App-Installationen für das Gerät erlauben.
5. Signiertes WGT installieren und starten.
6. Fokus, Steuerkreuz, OK/Zurück, Jellyfin-HTTP-Zugriff und AVPlay am echten Gerät prüfen.

Quellprüfung, CLI-Build, Installation und TV-Laufzeitprüfung stets getrennt berichten.

## Primärquellen

- [Samsung: TV-Web-Apps importieren und `required_version`](https://developer.samsung.com/smarttv/develop/getting-started/creating-tv-applications/importing-tv-applications.html?device=htv)
- [Samsung: TV CLI, WGT-Paketierung, Installation und Start](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html?device=htv)
- [Samsung: Voraussetzungen für Tizen Studio und TV Extension](https://developer.samsung.com/smarttv/develop/faq/tizen-studio.html?device=htv)
- [Samsung: TV-Signaturzertifikate](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)
- [Samsung: Tests auf dem Fernseher](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html)
- [Jellyfin-Dokumentation](https://jellyfin.org/docs/) und [API-Referenz](https://api.jellyfin.org/)

## Phasen und Abnahme

1. **Phase 0 – Machbarkeit:** installierbares WGT, bedienbarer Start, echte Jellyfin-Antwort, AVPlay-Verfügbarkeit untersucht.
2. **Phase 1 – Navigation und Design:** Seitenleiste, Details, Inhaltsreihen, Mock-Daten und Fokuserhalt.
3. **Phase 2 – Jellyfin-Bibliothek:** Anmeldung, API-Adapter, Titel, Details, Suche.
4. **Phase 3 – Wiedergabe:** AVPlay, Direct Play/Transcoding, Resume und Player-Steuerung.
5. **Phase 4 – Entdecken:** BoxSets, kuratierte Reihen, Darsteller und Empfehlungen.
6. **Phase 5 – Vollständiger Client:** Serien, Staffeln, Episoden und Merkliste.
7. **Phase 6 – Release:** Performance, Langzeittest, Kompatibilitätsmatrix und versioniertes WGT.

Der Nutzer hat die Designvorschau ausdrücklich vor erfolgreicher Phase 0 angefordert. Sie ist keine Freigabe als funktionierender TV-Client; das Machbarkeitstor bleibt offen.
