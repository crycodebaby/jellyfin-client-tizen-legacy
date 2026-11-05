# Zielbild der Smairys Mediathek

Stand: 5. November 2026. Dieses Dokument beschreibt die Nutzerziele und die geplante Entwicklung. Es ist kein Nachweis bereits umgesetzter oder sicherheitsgeprüfter Funktionen. Den aktuellen Arbeitsstand führen PROJECT_CONTEXT.md und TASKS.md.

## Übergeordnetes Ziel

Eine eigene, schnelle und persönlich gestaltete Familienmediathek. Filme liegen derzeit auf dem vorhandenen PC. Ein eigener Heimserver bleibt eine spätere Option. Berechtigte Familienmitglieder greifen zu Hause und unterwegs auf ihre Inhalte und ihre eigenen Jellyfin-Profile zu. Der Medienserver bleibt austauschbar.

## 1. Optionaler späterer Heimserver

- Betrieb unabhängig vom Alltags-PC, möglichst sparsam und wartungsarm.
- Vorhandene Datenträger nach Prüfung von Zustand, Kapazität und Anschluss weiterverwenden. N100 ist ein Kandidat, die Hardwareentscheidung bleibt offen.
- System und Jellyfin-Datenbank auf SSD, Filme auf erweiterbarem Datenspeicher.
- Automatischer Dienststart nach Neustart. Fehlende Datenträger verständlich melden.
- Sicherung und erprobte Wiederherstellung von Jellyfin-Datenbank, Konfiguration und nicht ersetzbaren Inhalten.

Erreicht, wenn Neustart und Wiederherstellung praktisch geprüft sind und der Alltags-PC ausgeschaltet bleiben kann.

## 2. Zugriff zu Hause und unterwegs

- TV-App im Heimnetz und mobile Oberfläche für iPhone und iPad.
- Eigene Domain und HTTPS als gewünschter Zugang.
- Privater VPN-Zugang und öffentlicher Zugang sind noch abzuwägen. Tailscale ist ein Kandidat für die erste private Ausbaustufe.
- Entscheidung anhand der benötigten Geräte, Benutzer und der gewünschten Nutzung ohne zusätzliche VPN-App.
- Mobile Daten, fremdes WLAN und Wiederverbindung nach Ausfall praktisch testen.

Erreicht, wenn ein berechtigtes Gerät außerhalb des Heimnetzes Anmeldung und Filmwiedergabe zuverlässig schafft.

## 3. Sicherheit und laufende Pflege

- Angriffsfläche begrenzen, Benutzerrechte trennen und Administration auf wenige Konten beschränken.
- Aktuelle Serverversion und Sicherheitsmeldungen vor Einrichtung prüfen. Versions- und CVE-Angaben aus fremden Agentenberichten gelten bis zur Gegenprüfung als unbestätigt.
- Tokens, Protokolle, Kopplung, Proxy-Vertrauen, Anfragelimits und Browser-Sicherheitsrichtlinien für die tatsächliche Bereitstellung prüfen.
- Getrennte Regeln für lokale TV-App, mobile Web-App und privilegierte PC-Dienste.
- Zertifikate, Schlüssel und private Konfiguration außerhalb des öffentlichen Repositories halten.

Erreicht, wenn Zugriffsrechte, abgelaufene Sitzungen, Fehlversuche und Sicherungswiederherstellung geprüft sind. Absolute Sicherheit ist kein erreichbares Abnahmekriterium.

## 4. Mobile Mediathek als PWA

- Moderne Oberfläche für iPhone und iPad mit Installation auf dem Home-Bildschirm.
- Anmeldung, Filmübersicht, Suche, Filmdetails und Wiedergabe als erster Umfang.
- Gerätegerechte Videoausgabe, Wiederaufnahme und verständliche Verbindungsfehler.
- Touch-Bedienung und Layout eigenständig gestalten, gemeinsame Jellyfin-Logik wiederverwenden.
- Tatsächliche iOS-Versionen, Browserfunktionen und Videoformate am Gerät prüfen.

Erreicht, wenn die Kernstrecke vom Login bis zur Wiederaufnahme auf echten mobilen Geräten geprüft ist.

## 5. Austauschbarer Jellyfin-Server

- Serveradresse und erforderliche Dienstadressen konfigurierbar machen.
- Anmeldungen, Profile und lokale Daten eindeutig einem Server zuordnen.
- Connect und Clip-Verarbeitung mit expliziten Schnittstellen und erreichbaren Dienstadressen anbinden.
- Medien-ID-Änderungen und erneute Anmeldung bei Umzug berücksichtigen.

Erreicht, wenn ein zweiter Jellyfin-Testserver ohne Quellcodeänderung verwendet werden kann und Daten beider Server getrennt bleiben.

## 6. Persönliche Familienprofile

- Profile mit rundem Bild oder Initialen und Name übersichtlich auswählen.
- Wechsel zwischen gespeicherten Anmeldungen mit wenigen Fernbedienungstasten.
- Eigene Merkliste, Verlauf, Fortschritt und Vorschläge je Jellyfin-Konto.
- Abgelaufene Sitzung, Profilentfernung und Abmeldung zuverlässig behandeln.
- Optionale Gestaltung über Smairys Connect später ergänzen.

Erreicht, wenn zwei echte Konten ohne Vermischung ihrer Daten wechseln können.

## 7. Schnelle, hochwertige TV-Oberfläche

- Tizen 2.4 als bestehendes Ziel erhalten. Sichtbarer Fokus und vorhersehbare D-Pad-Navigation.
- Lesbare Vorschau, Poster, Erscheinungsjahr und kurze Endzeitanzeige.
- Schauspieler mit Bildern, Personenseiten und fortlaufend bedienbarer Besetzung.
- Verständliche Filter und aktive Sammlungen auf der Startseite.
- Persönliche Begrüßungen und Witze aus einem erweiterbaren Katalog mit Wiederholungsvermeidung.
- Wiedergabequalität anhand von Originaldatei und TV-Fähigkeiten erhalten. Unterstützte Formate schrittweise am Gerät nachweisen.

## 8. Smairys Connect und persönliche Clips

- Handy-Anmeldung und Verbindung verständlich, wiederherstellbar und benutzergebunden gestalten.
- Serverwechsel und HTTPS unterstützen.
- Clip-Erstellung mit Benutzerrechten, Speichergrenzen und robusten Hintergrundaufträgen.
- Clip-Wiedergabe und Schnittgrenzen mit echten Dateien prüfen.

## 9. Updates ohne persönliche Hilfestellung

- Installierte Version und freigegebene Updates in der App anzeigen.
- Update per Fernbedienung auslösen, Fortschritt und Fehler nachvollziehbar melden.
- Nach erfolgreicher Installation App starten und gespeicherte Profile erhalten.
- Technische Installation über einen geprüften Dienst oder einen anderen für das Zielgerät nachgewiesenen Verteilweg.
- Automatische Updates erst nach verifiziertem manuellen Updateablauf ergänzen.

Erreicht, wenn ein Familienmitglied ein Update ohne Entwicklerwerkzeuge bedienen kann und Fehler ohne Datenverlust behandelt werden.

## 10. Gepflegtes Projekt und nachvollziehbare Releases

- Aktuellen Stand privatheitsgeprüft in Git sichern und GitHub gezielt aktualisieren.
- Relevante Tests reparieren und vor Releases ausführen.
- Quellstand, Paketversion und installierte Version nachvollziehbar zuordnen.
- Dokumentation zwischen geplant, implementiert, simuliert geprüft, installiert und am Gerät bestätigt unterscheiden.
- AGENTS.md als Einstieg, PROJECT_CONTEXT.md als Übersicht und TASKS.md als Arbeitsliste pflegen.

## Empfohlene Reihenfolge

1. Arbeitsstand sichern, Tests und Profilwechsel stabilisieren, Doku abgleichen.
2. Heimserver auswählen und Betrieb einschließlich Sicherung prüfen.
3. Fernzugriffsmodell festlegen und mit begrenztem Benutzerkreis erproben.
4. Erste mobile PWA mit Login, Filmen und Wiedergabe entwickeln.
5. Serverwechsel, Connect und Clips entkoppeln und testen.
6. Updateverteilung und weitere persönliche Funktionen ausbauen.

Die Reihenfolge ist ein Vorschlag. Konkrete Produkte, Preise, Cloudflare-Nutzungsbedingungen und behauptete Sicherheitslücken müssen vor Entscheidungen anhand aktueller Primärquellen geprüft werden.

## Serien als vorbereitete Erweiterung

Filme haben aktuell Vorrang. Serien dürfen in der normalen Oberfläche noch keinen sichtbaren Einstieg haben. Die vorhandenen Abfragen für Serien, Staffeln und Episoden sowie die Tests bleiben erhalten. Die lokale Option enableSeries schaltet den Einstieg ausschließlich für gezielte Entwicklungs- und Gerätetests frei. Vor allgemeiner Freigabe sind Episodenfortschritt, nächste Episode, Profiltrennung und Rücknavigation am Gerät abzunehmen.
