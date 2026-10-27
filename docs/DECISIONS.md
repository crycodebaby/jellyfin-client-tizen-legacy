# Entscheidungslog

Hier stehen Entscheidungen, die die weitere Umsetzung bestimmen. Nicht bestätigtes Verhalten bleibt ausdrücklich gekennzeichnet.

## D1 – Statische Web-App für Phase 0

**Status:** angenommen. HTML, CSS und ES5-JavaScript direkt als Tizen-Web-App nutzen. Die alte Ziel-WebEngine verlangt wenige Abhängigkeiten und überschaubare Performancekosten. Quellsyntax wurde lokal geprüft; die TV-Laufzeit ist unbestätigt.

## D2 – Jellyfin als einzige Mediendatenquelle

**Status:** angenommen. Keine parallele Mediendatenbank aufbauen. Jellyfin verwaltet Benutzer, Bibliotheken, Metadaten, Bilder, Dateien und Wiedergabestatus.

## D3 – Phase 0 bleibt Freigabetor

**Status:** angenommen, mit ausdrücklich gewünschter Vorschau. Paketierung und Installation, Fernbedienung und echte Jellyfin-Antwort müssen vor einer Freigabe als funktionierender TV-Client nachgewiesen werden. Der Nutzer hat die Designvorschau vor diesem Nachweis angefordert. Ein Desktop-Browser belegt das Verhalten auf dem Fernseher nicht.

## D4 – `required_version="2.3"`

**Status:** umgesetzt, Installation unbestätigt. Samsung dokumentiert diesen Wert für Kompatibilität mit Fernsehern ab 2015. Die Deklaration ist kein Funktionsnachweis für den UE65KU6099.

## D5 – Zentrales austauschbares Branding

**Status:** angenommen. App-Icon und Logo-Varianten liegen mit stabilen Dateinamen unter `branding/`. Andere Nutzer können die Dateien für ein eigenes Erscheinungsbild ersetzen.

## D6 – MIT für Code und Doku, Logos ausgenommen

**Status:** vom Nutzer bestätigt. Der App-Quellcode und die Projektdokumentation stehen unter MIT. Die drei Smairys-Logodateien sind ausgenommen; die Lizenz gewährt keine Markenrechte.

## D7 – Keine privaten LAN-Daten veröffentlichen

**Status:** angenommen. PC-/TV-IP-Adressen und private Servernamen gehören nicht in die öffentlichen Projektdateien. Das Serverfeld bleibt editierbar und standardmäßig leer.

## D8 – Gekennzeichnete Designvorschau

**Status:** auf Nutzerwunsch umgesetzt, TV-Prüfung offen. Navigation, eigene SVG-Platzhalter, Darsteller-/Duo-Karten, Suche und eine temporäre Merkliste zeigen Beispieldaten. Der Verbindungsdialog bleibt nutzbar. So kann das Design geprüft werden, während das technische Machbarkeitstor offen bleibt.

## D9 – Externe Beiträge während der Entwicklungsphase geschlossen

**Status:** vom Nutzer beschlossen. Das GitHub-Repository ist öffentlich lesbar, wird aber allein vom Inhaber gepflegt. Issues, Pull Requests, Diskussionen und Wiki wurden deaktiviert; bei der Prüfung war nur der Inhaber als Collaborator aufgeführt. Öffentliche Forks können dadurch nicht verhindert werden. Weitere Einzelheiten und offene Einstellungen stehen in `docs/GITHUB_SETUP.md`.

## D10 – Markenwerte zentral konfigurieren

**Status:** umgesetzt. Sichtbarer Name, Titel, Avatar-Buchstabe und Slogan stehen in `branding/config.js`; die Bilddateien bleiben unter stabilen Namen austauschbar. Der TV-Launcher-Name muss zusätzlich in `config.xml` angepasst werden, da das Manifest statisch ist.

## D11 – Bewegung sparsam und abschaltbar

**Status:** als Desktop-Vorschau umgesetzt, TV-Prüfung offen. Die Modi Voll, Reduziert und Aus sind lokal einstellbar. Ohne verlässlich erkannte Systemvorgabe wird reduziert gestartet. Die Ladeanzeige erscheint verzögert nur bei laufender Verbindungsprüfung. Navigation und Fokus warten nicht auf Animationen. Diagnose wird ausdrücklich aktiviert und sendet keine Daten. Messgrenzen und weitere Entscheidungen stehen in `docs/MOTION.md`.
