# Offene Projektaufgaben

Aktueller Stand und Prüfgrenzen stehen in [PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md). Produktziele in [ZIELBILD.md](docs/ZIELBILD.md).

## Stabilisierung 0.1.41

- [x] Vollständige lokale Tests mit FFmpeg und QR ausführen.
- [x] Profilwechsel vor Austausch der aktiven Sitzung validieren.
- [x] Serverausfall und ungültige Zielanmeldung beim Profilwechsel simuliert prüfen.
- [x] Fortsetzen auch bei HLS durch bestätigten Player-Suchvorgang prüfen.
- [x] Position bei serverseitigem Tonwechsel erhalten, simuliert prüfen.
- [x] Serien-Einstieg und Serienanzahl standardmäßig im UI ausblenden.
- [x] Web-Build prüfen und 0.1.41 laut Apps2Samsung auf dem ersten TV installieren/starten.
- [x] Fortsetzen nach Beenden und erneutem Öffnen bei einem Film auf dem ersten TV vom Nutzer bestätigt.
- [ ] Weitere echte Filmformate, HLS, Tonwechsel, Untertitel und Wiedergabeende am TV abnehmen.
- [ ] Fehlerfälle mit zwei echten Konten, Neustart, Speicherfehler und Serverausfall am Gerät prüfen.

## Wiedergabe

- [ ] Geräteprofil anhand repräsentativer eigener Testdateien erweitern. MKV, HEVC und AC3 sind noch keine freigegebenen Fähigkeiten.
- [ ] HLS-Zeitbasis und native Suchfähigkeit am Ziel-TV verifizieren.
- [ ] Spurwechsel bei pausierter Wiedergabe und Wiederherstellung der Pause verbessern.
- [ ] Externe Textuntertitel während Transcoding und Bilduntertitel untersuchen.
- [ ] Wiederholung fehlgeschlagener Fortschrittsmeldungen und Offline-Verhalten entwickeln.
- [ ] Serienabnahme erst bei tatsächlichem Bedarf. Bis dahin bleibt enableSeries aus.

## Konten und Betrieb

- [ ] Passwort-Fallback und sichere Tokenablage auf Tizen prüfen.
- [ ] Account-Bilder anbinden und gespeicherte Profile gezielt entfernen können.
- [ ] Update-Dienst und Versionsanzeige entwickeln. Derzeit installiert Apps2Samsung manuell.
- [ ] Plattformunabhängige Geräteprofile und mobile Oberfläche vorbereiten.

## Clips, Fernzugriff und Serverumzug

- [ ] Clipquote, Speicherfehler, Löschung und authentifizierter mobiler Download.
- [ ] Clipgrenzen und Ton mit echten Dateien prüfen.
- [ ] Relay für getrennte HTTPS-Adressen, Hostprüfung und QR-Ziele entwickeln und abnehmen.
- [ ] Heimserver nur als spätere Option. Vorlagen erst nach Hardwareentscheidung bereitstellen.
- [ ] Sicherung wiederherstellen und Servermigration mit geänderten Medienpfaden und IDs testen.
- [ ] Privaten Mobilfunkzugriff mit berechtigtem Gerät abnehmen.

## Repository

- [ ] Neue Änderungen künftig in kleinen nachvollziehbaren Commits sichern.
- [ ] CI-Ergebnis nach GitHub-Push prüfen.
- [ ] Historische Branches mit privaten Daten weder zusammenführen noch pauschal veröffentlichen.
