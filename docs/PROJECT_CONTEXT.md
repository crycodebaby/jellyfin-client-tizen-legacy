# Projektkontext

Stand 5. November 2026. Einstieg für Coding-Agenten und Mitwirkende. Produktziele stehen in [ZIELBILD.md](ZIELBILD.md), offene Arbeit in [TASKS.md](../TASKS.md). Historische Gerätebeobachtungen stehen in [TIZEN_BUILD.md](TIZEN_BUILD.md).

## Produkt und Plattform

Smairys Mediathek ist eine private Familienmediathek auf Jellyfin. Der vorhandene PC bleibt der aktuelle Server. Ein eigener Heimserver und Fernzugriff sind Zukunftsoptionen. Serien sind intern vorbereitet und standardmäßig im UI verborgen.

Zielgerät ist Samsung UE65KU6099, Tizen 2.4 und WebKit r152340. Laufzeitcode bleibt ES5. HTML/CSS und feste 1920×1080-Oberfläche ohne Framework, Bundler oder externe Laufzeit-CDNs. Fernbedienung, sichtbarer Fokus und Lesbarkeit haben Vorrang. Private Geräteadressen und Signierdaten bleiben außerhalb des Repositorys.

## Aktueller Freigabestand

- Version 0.1.41 hat 98 Basis- und 80 UI-Tests bestanden, ohne ausgelassene Tests bei konfiguriertem FFmpeg und Python. npm audit meldete keine bekannten Schwachstellen. Das ist eine zeitpunktbezogene Prüfung der Entwicklungsabhängigkeiten.
- Web-Build geprüft. Apps2Samsung meldete Installation und Start von 0.1.41 auf dem ersten TV. Der Nutzer bestätigte Fortsetzen, Beenden und erneutes Öffnen an der richtigen Stelle bei einem Film. Die dabei verwendete Wiedergabeart wurde nicht erfasst.
- Der zweite TV erhielt zuletzt 0.1.39. Kein automatisches Update implementiert.
- Profilwechsel prüft die Zielsitzung vor dem Wechsel. Simulierte Tests prüfen erfolgreiche Wechsel, Serverausfall und ungültige Zielanmeldung.
- Direktwiedergabe und HLS verwenden denselben Such- und Bestätigungsablauf zum Fortsetzen. Fortschritt bleibt während eines ausstehenden Sprungs unterdrückt. HLS-Zeitbasis und Suchfähigkeit müssen mit echten Medien am TV verifiziert werden.
- Serverseitiger Tonwechsel versucht, die aktuelle Position nach dem Quellenwechsel wiederherzustellen. Simuliert geprüft, Geräteabnahme offen.
- Das konservative Geräteprofil bleibt auf MP4/H.264/AAC und 12 Mbit/s beschränkt. HLS verwendet Stereo. Weitere Codecs werden erst nach Medien- und Gerätetests freigegeben.
- Frühere Nutzerrückmeldungen bestätigten Bild/Ton, grundlegende Sprünge, Direktwiedergabe-Fortsetzen, deutsche Tonspur bei einem Film, Merkliste, Sammlungen, Handy-Kopplung sowie Schauspielerbilder und Navigation. Diese Einzelprüfungen bestätigen nicht alle Medienformate und Fehlerszenarien.

## Codekarte

| Bereich | Einstieg |
| --- | --- |
| UI, Fokus, Sitzungskoordination | app.js, index.html, styles.css |
| Texte und Auswahl | banner-texts.js, selectBanner in app.js |
| Jellyfin-Transport und Datenmodelle | jellyfin-http.js, jellyfin-client.js |
| Wiedergabezustände und Samsung-Adapter | playback.js, avplay-adapter.js |
| Connect-TV-Client | companion-tv.js |
| LAN-Dienst und Handyoberfläche | companion/relay.cjs, companion/web |
| Clipauswahl und Schnitt | clip-selection.js, companion/clip-*.cjs |
| Build und Dateiliste | scripts/build-web.ps1, scripts/runtime-files.cjs |
| Prüfungen | package.json, tests, .github/workflows/checks.yml |

app.js ist weiterhin groß. Änderungen zunächst entlang der vorhandenen Grenzen klein halten und durch Verhaltenstests absichern. Schrittweise Extraktion ist sinnvoll, eine vollständige Neufassung ist kein aktueller Auftrag.

## Sitzungen und Daten

Jellyfin ist Quelle für Benutzer, Rechte, Medien und Wiedergabestatus. Token und Gerätekennung werden für gespeicherte Profile dauerhaft im localStorage abgelegt. Dieser Speicher ist nicht als verschlüsselt nachgewiesen. Ein Passwort-Fallback besteht bei Speicherfehlern noch. Abmelden entfernt das aktive Profil, andere gespeicherte Profile bleiben erhalten. HTTP im LAN ist unverschlüsselt. Medien-URLs enthalten Tokens, deshalb keine vollständigen URLs protokollieren.

Profile und Sammlungsverknüpfungen sind nach Serveradresse und Benutzer-ID getrennt. Der Wechsel einer Serveradresse ist keine automatische Datenmigration. Neue Jellyfin-IDs erfordern einen eigenen Umzugsablauf.

## Grenzen

- Fortschritt bei Netzwerkausfall hat keine dauerhafte Offline-Warteschlange.
- Externe Textuntertitel und Clips sind auf Direktwiedergabe beschränkt.
- Clipdateien liegen zentral und benutzergetrennt auf dem PC. Keine mobile Downloadoberfläche, keine Speicherquote. Details in [CLIPS.md](CLIPS.md).
- Clientseitige HTTPS-Connect-Adresse ist konfigurierbar. Relay-Hostprüfung und QR-Bilder sind noch nicht für beliebigen Proxybetrieb freigegeben.
- Serienfunktionen nur mit lokalem enableSeries=true für Entwicklung sichtbar.
- Heimserver-Compose wurde als Konfiguration validiert, nicht auf neuer Hardware gestartet.
- Vollständige Medien-, Fernbedienungs- und Wiederherstellungsabnahme bleibt Freigabetor.

## Arbeitsweise und Abnahme

npm test prüft Basis und UI. Für vollständige Medienprüfungen SMAIRYS_TEST_FFMPEG und SMAIRYS_TEST_FFPROBE auf FFmpeg setzen. SMAIRYS_QR_PYTHON muss auf Python mit ReportLab zeigen. CI installiert diese Werkzeuge ebenfalls.

npm run check prüft ES5, Manifest und Dokumentlinks. npm run check:public prüft Git-Historie. node scripts/check-public-history.cjs --worktree prüft zusätzlich den vorgesehenen Arbeitsbaum. Kein automatischer Scanner ersetzt die Durchsicht neuer Dateien.

Tests und Build nacheinander ausführen, weil beide den Runtime-Ordner vorbereiten. Laufzeitdateien ausschließlich aus runtime-files.cjs paketieren. Signierdaten und private Servervorgaben gehören nur in lokale Testpakete.

Zusätzliche Anleitungen in [HOME_SERVER.md](HOME_SERVER.md), [SERVER_CONNECTIONS.md](SERVER_CONNECTIONS.md) und [PHONE_COMPANION.md](PHONE_COMPANION.md). Frühere Entscheidungen können durch diese aktuelle Übersicht ausdrücklich überholt sein.
