# Projektaufgaben

## Phase 0 – technische Machbarkeit

### Toolchain und Paket

- [ ] Tizen Web CLI reparieren: `build-web` scheitert bei 80 % mit `NoClassDefFoundError: org/eclipse/core/runtime/Plugin`.
- [ ] Samsung TV Extension und TV-Projektvorlagen bereitstellen; sichtbar sind derzeit Tizen-Plattformen 6.0–9.0 ohne TV-Vorlagen.
- [ ] Gültiges Samsung-TV-Signaturprofil finden oder einrichten.
- [ ] Signiertes WGT bauen und Paketinhalt sowie Signaturen prüfen.

### Echter Fernseher

- [ ] UE65KU6099 per SDB verbinden; `sdb devices` zeigte zuletzt kein Gerät.
- [ ] WGT installieren und starten.
- [ ] Steuerkreuz, sichtbaren Fokus, OK und Zurück prüfen.
- [ ] Jellyfin-HTTP-Anfrage aus der App prüfen.
- [ ] Aufrufbarkeit von AVPlay auf Tizen 2.4 feststellen.

## Öffentliche Veröffentlichung

- [x] MIT-Lizenz für Quellcode und Dokumentation festgelegt.
- [x] Markenlogos von MIT ausgenommen und zentral austauschbar gemacht.
- [x] Externe Beiträge während der Entwicklungsphase ausgeschlossen; GitHub-Einrichtung dokumentiert.
- [x] `.gitignore`, Laufzeit-Dateiliste und automatisierte Quell-/Browserprüfungen vorbereitet.
- [x] Desktop-Screenshot für die README erstellt; der Screenshot mit Markenlogo ist nicht unter MIT lizenziert.
- [ ] Vor jedem Push Dateien und erreichbare Git-Historie auf private Daten und Commit-E-Mail-Adressen prüfen.
- [x] Bereinigten Veröffentlichungszweig `github-ready` mit eigener Historie und GitHub-Noreply-Adresse vorbereiten; ältere lokale Entwicklungscommits bleiben lokal.
- [ ] Öffentliches GitHub-Repository erstellen und geprüften Stand hochladen.
- [ ] Nach der Repository-Erstellung Issues, Pull Requests, Discussions und Wiki deaktivieren und Schreibrechte/Ruleset prüfen.

## Erledigt

- [x] Gewünschte Designvorschau mit Seitenleiste, Startseite, Darsteller-/Duo-Beispielen, Suche, Details und temporärer Merkliste umgesetzt.
- [x] Navigation, Rückkehr aus Dialogen, Suche, Darsteller-Duo und Merkliste im Desktop-Browser mit Tastatur geprüft.
- [x] Verbindungsdialog mit leerer Eingabe und lokaler HTTP-Testantwort geprüft; der Test auf dem TV ist offen.
- [x] Änderbare Jellyfin-Adresse und Anfrage an `/System/Info/Public` eingebaut.
- [x] Smairys-Logos in einem austauschbaren Branding-Ordner zusammengeführt.
- [x] README und gemeinsame Einstiegsdokumente für Agenten angelegt.
- [x] Projektname und Slogan für eigene Varianten in `branding/config.js` zentral konfigurierbar gemacht.
- [x] GitHub-Actions-Workflow für eigene Pushes und manuelle Prüfungen vorbereitet; keine Pull-Request-Auslösung.

## Verifizierter Stand (27.10.2026)

- Der öffentliche Jellyfin-Infoendpunkt antwortete vom Entwicklungs-PC; Version 12.3.0 wurde beobachtet. Private Server- und LAN-Daten stehen nicht in den öffentlichen Projektdateien.
- Tizen CLI meldet Version 2.5.25. `build-web` scheitert an der fehlenden Eclipse-Klasse `org.eclipse.core.runtime.Plugin`; ein WGT wurde nicht erzeugt.
- Sichtbare SDK-Plattformen: Tizen 6.0, 6.5, 7.0, 8.0 und 9.0. Samsung TV Extension und TV-Vorlagen wurden in den geprüften Installationspfaden nicht gefunden.
- Unter `C:\tizen-studio-data\ide\keystore\profiles.xml` wurde kein Signaturprofil gefunden.
- `sdb devices` zeigte kein Gerät; der TV war unter der dokumentierten Entwicklungsadresse nicht erreichbar.
- Installation, Fernbedienung am Gerät, Jellyfin-Anfrage vom TV und AVPlay sind ungetestet.
- Das Projekt besitzt lokale Git-Commits, aber noch kein GitHub-Remote.

## Designprüfung – vorläufig, nur Desktop

- **Hierarchie:** eine primäre Serveraktion, ein Hero und eine Beispielreihe; redundante Beschriftungen entfernt.
- **Fernbedienung:** einzelner sichtbarer Fokus und Richtungsnavigation im Desktop-Browser geprüft.
- **Minimalismus:** keine doppelten Einstellungsbuttons oder erklärenden Kacheln.
- **Lesbarkeit:** Größen für 1080p gewählt; Betrachtungsabstand am TV muss geprüft werden.
- **Konsistenz:** gemeinsame dunkle Palette, orangefarbener Fokus und wiederverwendete Karten und Aktionen.
- **Microinteractions:** kurze Farb- und Rahmenübergänge; keine Daueranimation.

Das Skill-Ziel von 90/100 wird erst nach einer Bewertung am echten TV samt Betrachtungsabstand und Laufzeitverhalten eingeordnet.
