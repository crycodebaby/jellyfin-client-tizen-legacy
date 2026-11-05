# Projektkontext

Stand 5. November 2026. Einstieg für Coding-Agenten und Mitwirkende. Produktziele stehen in [ZIELBILD.md](ZIELBILD.md), offene Arbeit in [TASKS.md](../TASKS.md). Historische Gerätebeobachtungen stehen in [TIZEN_BUILD.md](TIZEN_BUILD.md).

## Produkt und Plattform

Smairys Mediathek ist eine private Familienmediathek auf Jellyfin. Der vorhandene PC bleibt der aktuelle Server. Ein eigener Heimserver und Fernzugriff sind Zukunftsoptionen. Serien sind intern vorbereitet und standardmäßig im UI verborgen.

Zielgerät ist Samsung UE65KU6099, Tizen 2.4 und WebKit r152340. Laufzeitcode bleibt ES5. HTML/CSS und feste 1920×1080-Oberfläche ohne Framework, Bundler oder externe Laufzeit-CDNs. Fernbedienung, sichtbarer Fokus und Lesbarkeit haben Vorrang. Private Geräteadressen und Signierdaten bleiben außerhalb des Repositorys.

## Aktueller Freigabestand

- Version 0.1.42 bestand 98 Basis- und 80 UI-Tests mit FFmpeg und QR ohne Auslassungen. Der Build und das signierte Paket wurden geprüft. Apps2Samsung meldete das Update und den Start auf dem ersten TV. Die Bedienabnahme für 0.1.42 steht aus. Geräte- und Build-Nachweise stehen im [Tizen-Leitfaden](TIZEN_BUILD.md).
- Bei 0.1.41 bestätigte der Nutzer auf dem ersten TV das Fortsetzen eines Films nach Beenden und erneutem Öffnen. Die Wiedergabeart wurde nicht erfasst. Der zweite TV erhielt zuletzt 0.1.39.
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

TV-Designarbeit: [TV-UX-Analyse](TV_UX_REVIEW.md), [Fokus-Maps](TV_FOCUS_MAPS.md) und [Designwerkzeuge](DESIGN_TOOLING.md). Die überarbeitete [Designanleitung](../SKILL.md) trennt Hardwaregrenzen, Produktwünsche und veränderbare Gestaltung. Die Analyse vom 5. November ist keine neue UI-Version oder Geräteabnahme.

Die Startseite hat eine feste Kopfzeile und eine umbruchfähige Begrüßung. Filmjahr, Gesehen-Markierung und Fortschritt stehen außerhalb der Poster. Entdecken bündelt Suche, Sortierung und kombinierbare Filter. Jahressortierung und Jahrzehntfilter wurden zusätzlich in der Browser-Vorschau mit der lokalen Jellyfin-Bibliothek geprüft. Die Personenseite hat derzeit eine gekürzte Kurzbiografie und ein fest skaliertes TV-Layout. Ihre Neugestaltung steht in [TASKS.md](../TASKS.md).

In Entdecken entsteht die Darsteller-Rangliste aus der Besetzung verfügbarer Filme des angemeldeten Profils. Der Client lädt die Filmdaten seitenweise und hält die vollständige Rangliste bis zu fünf Minuten im Speicher der Sitzung. Namenssuche und A–Z filtern diese Rangliste. Wenn keine Filmzahlen ermittelt werden können, bleibt die Personensuche mit entsprechendem Hinweis nutzbar.

npm test prüft Basis und UI. Für vollständige Medienprüfungen SMAIRYS_TEST_FFMPEG und SMAIRYS_TEST_FFPROBE auf FFmpeg setzen. SMAIRYS_QR_PYTHON muss auf Python mit ReportLab zeigen. CI installiert diese Werkzeuge ebenfalls.

npm run check prüft ES5, Manifest und Dokumentlinks. npm run check:public prüft Git-Historie. node scripts/check-public-history.cjs --worktree prüft zusätzlich den vorgesehenen Arbeitsbaum. Kein automatischer Scanner ersetzt die Durchsicht neuer Dateien.

Tests und Build nacheinander ausführen, weil beide den Runtime-Ordner vorbereiten. Laufzeitdateien ausschließlich aus runtime-files.cjs paketieren. Signierdaten und private Servervorgaben gehören nur in lokale Testpakete.

Zusätzliche Anleitungen in [HOME_SERVER.md](HOME_SERVER.md), [SERVER_CONNECTIONS.md](SERVER_CONNECTIONS.md) und [PHONE_COMPANION.md](PHONE_COMPANION.md). Frühere Entscheidungen können durch diese aktuelle Übersicht ausdrücklich überholt sein.
