# Offene Projektaufgaben

Aktueller Stand in [PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md). Produktziele in [ZIELBILD.md](docs/ZIELBILD.md). Erledigte Versionsänderungen stehen im [Versionsverlauf](CHANGELOG.md).

## Nächste Geräteabnahme

- [ ] 0.1.42 auf dem ersten TV prüfen: Entdecken mit Filterkombination und Reset, Suche mit Rückkehr zum Fokus, Startreihen, freie Posterflächen und Profilnavigation.
- [ ] Weitere reale Medienformate, HLS-Suchvorgänge, Tonwechsel, Textuntertitel und Wiedergabeende prüfen.
- [ ] Fehlerfälle mit zwei echten Konten, TV-Neustart, Speicherfehler und Serverausfall am Gerät prüfen.

## TV-UI und Bedienung

- [ ] Personenseite neu gliedern: kompakte Lebensdaten, lesbare Kurzbiografie und eigene Filmsektion. Biografievorschau darf bei Ordnungszahlen nicht abbrechen.
- [ ] Personenseite im schmaleren PC-Fenster und auf dem TV getrennt prüfen. Rückweg passend zum Ursprung beschriften.
- [ ] Ladefokus bei verzögerter Antwort absichern, insbesondere in Filme und Sammlungen.
- [ ] Offene Gestaltungspunkte anhand der [Fokus-Maps](docs/TV_FOCUS_MAPS.md) am Gerät abnehmen.

## Wiedergabe

- [ ] Geräteprofil mit repräsentativen Medien prüfen. MKV, HEVC und AC3 sind noch keine freigegebenen Fähigkeiten.
- [ ] Spurwechsel bei pausierter Wiedergabe und Wiederherstellung der Pause verbessern.
- [ ] Externe Textuntertitel während Transcoding und Bilduntertitel untersuchen.
- [ ] Wiederholung fehlgeschlagener Fortschrittsmeldungen und Offline-Verhalten entwickeln.
- [ ] Serien bei Bedarf abnehmen. Bis dahin bleibt `enableSeries` aus.

## Konten und Betrieb

- [ ] Passwort-Fallback und sichere Tokenablage auf Tizen prüfen.
- [ ] Profilbilder anbinden und gespeicherte Profile gezielt entfernen können.
- [ ] Update-Dienst und Versionsanzeige untersuchen. Der Gerätebetrieb nutzt private Apps2Samsung-Updates.
- [ ] Plattformunabhängige Geräteprofile und mobile Oberfläche vorbereiten.

## Clips, Fernzugriff und Serverumzug

- [ ] Clipquote, Speicherfehler, Löschung und authentifizierten mobilen Download umsetzen.
- [ ] Clipgrenzen und Ton mit echten Dateien prüfen.
- [ ] Relay für getrennte HTTPS-Adressen, Hostprüfung und QR-Ziele abnehmen.
- [ ] Heimserver und privaten Mobilfunkzugriff bei vorhandener Zielhardware einrichten. Die Vorlagen sind vorbereitet.
- [ ] Sicherung und Migration mit geänderten Medienpfaden und IDs testen.
