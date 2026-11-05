# Entscheidungslog

Hier stehen Architektur- und Produktentscheidungen. Aktuelle Implementierung und Prüfgrenzen stehen im [Projektkontext](PROJECT_CONTEXT.md).

## Besetzung, Merkliste und Personensuche

Bei angemeldetem Nutzer kommen Besetzung, Personenbilder und Film-Favoriten ausschließlich von Jellyfin. Die Schauspielersuche fragt Personen und deren Filme serverseitig ab. Film- und Personenergebnisse werden begrenzt angezeigt; Detail-, Such- und Favoritenanfragen sind abbrechbar. Der Nutzer bestätigte Besetzung und Merkliste auf dem Fernseher; Personensuche und weitere Rückwege bleiben dort zu prüfen. Ohne Anmeldung bleibt die gekennzeichnete Beispielvorschau getrennt.

## Experimenteller Filmplayer

Jellyfin PlaybackInfo ermittelt eine Quelle für ein konservatives Geräteprofil; AVPlay übernimmt die Wiedergabe. Start, Pause, Fortschritt und Stop werden nach Möglichkeit an Jellyfin gemeldet. Zusätzlich zu simulierten Tests bestätigte der Nutzer grundlegende Wiedergabe mit Bild und Ton auf dem Ziel-TV; weitere Formate, Netzwerkunterbrechungen und tatsächliche Codecs bleiben offen. Medien-URLs werden nicht absichtlich dauerhaft gespeichert. Sitzungstoken werden im Webspeicher abgelegt (D12). Die Wiederaufnahme eines Films bei Direktwiedergabe wurde vom Nutzer am TV bestätigt; bevor der Sprung bestätigt ist, wird keine neue Position gemeldet. Beim natürlichen Ende wird die tatsächliche AVPlay-Position vor dem Schließen erfasst, sofern sie verfügbar und kein Suchvorgang ausstehend ist. Gesehen-Status und Wiederaufnahmeschwelle bestimmt Jellyfin; der lokal geprüfte Server verwendet 90 Prozent. Es wird kein eigener pauschaler Abspann-Endpunkt angenommen. Für Fortsetzen und serverseitigen Tonwechsel gilt die Aktualisierung 0.1.41 am Ende dieses Dokuments.

## Anmeldung: Server und Benutzername merken

Die App speichert nach erfolgreicher Serverprüfung die editierbare Serveradresse und nach erfolgreicher Anmeldung den zugehörigen Benutzernamen. Gespeicherte Sitzungen haben Vorrang. Ein Passwort-Fallback besteht, wenn bei Passwortanmeldung die Sitzung nicht gespeichert werden kann. Siehe D12. Nicht verfügbarer Speicher darf den Login nicht verhindern. Für ein privates Testpaket kann eine lokale Servervorgabe ergänzt werden; der Quellstand enthält keine privaten Adressen oder Passwörter. Der Nutzer bestätigte die schnelle erneute Anmeldung nach einem App-Neustart auf dem Ziel-TV; die Löschfunktion ist dort noch zu prüfen.

## D1 – Statische Web-App für Phase 0

**Status:** angenommen. HTML, CSS und ES5-JavaScript direkt als Tizen-Web-App nutzen. Die alte Ziel-WebEngine verlangt wenige Abhängigkeiten und überschaubare Performancekosten. Quellsyntax und ausgewählte Funktionen wurden geprüft; nicht jede Funktion ist auf dem TV bestätigt.

## D2 – Jellyfin als einzige Mediendatenquelle

**Status:** angenommen. Keine parallele Mediendatenbank aufbauen. Jellyfin verwaltet Benutzer, Bibliotheken, Metadaten, Bilder, Dateien und Wiedergabestatus.

## D3 – Phase 0 bleibt Freigabetor

**Status:** angenommen, mit ausdrücklich gewünschter Vorschau. Paketierung und Installation, Fernbedienung und echte Jellyfin-Antwort müssen vor einer Freigabe als funktionierender TV-Client nachgewiesen werden. Der Nutzer hat die Designvorschau vor diesem Nachweis angefordert. Ein Desktop-Browser belegt das Verhalten auf dem Fernseher nicht.

## D4 – `required_version="2.3"`

**Status:** umgesetzt; ein Paket mit dieser Deklaration wurde auf dem Ziel-TV installiert und gestartet. Samsung dokumentiert diesen Wert für Kompatibilität mit Fernsehern ab 2015. Die Deklaration allein bestätigt nicht alle Funktionen.

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

## D12 – Gespeicherte Sitzungen pro Server und Benutzer

**Status:** implementiert, echter Login auf dem TV bestätigt. Sitzungstoken und Gerätekennungen werden im localStorage dauerhaft gespeichert. Profile sind nach Serveradresse und Benutzer-ID getrennt. Beim Wechsel wird die Zielsitzung serverseitig geprüft. Der Webspeicher ist nicht als verschlüsselte Ablage belegt. Ein Passwort-Fallback aus der bisherigen Anmeldung besteht weiterhin. Abmelden löscht die lokale Sitzung sofort und versucht den serverseitigen Logout; bei Netzwerkfehler ist dessen Erfolg nicht garantiert. Jede Anmeldung verwendet vorläufig eine neue Gerätekennung, um alte und neue Sitzungen bei einem Logout-Rennen zu trennen. Das kann zusätzliche Geräteeinträge auf dem Server erzeugen; eine stabile Geräteidentität und sichere Wiederherstellung benötigen weitere Prüfung. HTTP schützt Zugangsdaten und Token nicht vor Mitlesen im Netzwerk.

## D13 – Begrenztes Filmfenster

**Status:** mit simulierten Antworten im Desktop geprüft. Bis zu fünf Filmkarten sind in der aktiven Reihe fokussierbar; vorherige und nächste Reihe erscheinen angeschnitten und gedämpft. Navigation und Detailrückkehr verwenden Jellyfin-IDs. Abfragen nutzen Offset und `SortName`. Bei gleichnamigen Titeln oder Änderungen während des Blätterns können sich Ergebnisse verschieben; lückenlose, stabile Pagination ist damit nicht garantiert und muss weiter untersucht werden. Das erweiterte Layout, Gerätelast und Bildzugriff auf dem TV sind nicht gemessen.

## D14 – Begrenzter Filmseiten-Puffer

**Status:** experimentell, Desktop-Prüfung mit simulierten Antworten. Die App fragt bis zu 20 Filme je Datenseite ab und hält höchstens zwei Seiten im Arbeitsspeicher; sie werden höchstens 60 Sekunden lang wiederverwendet und bei der nächsten Pufferabfrage entfernt. Für die Vorschau der nächsten Reihe kann eine weitere Seite vorab geladen werden. Der Puffer gehört ausschließlich zur aktuellen Sitzung und wird beim Abmelden beziehungsweise Sitzungsverlust gelöscht.

Kurze, leere oder überlappende Seiten und geänderte Gesamtzahlen werden als mögliche Inkonsistenz behandelt: Das letzte gültige Fenster bleibt erhalten, bis Filme erneut geöffnet und die Liste neu geladen wird. Diese konservative Prüfung garantiert keine stabile Reihenfolge; Veränderungen ohne erkennbaren Widerspruch können weiterhin Titel verschieben. Eine strikte Prüfung kurzer Seiten ist eine eigene defensive Annahme und kein belegtes Versprechen der Jellyfin-API. Die Seitengröße ist zunächst ein Testwert, kein auf dem Zielgerät optimierter Wert.

## Aktualisierung 0.1.41 – Fortsetzen und Profile

Frühere Aussagen zum grundsätzlichen Neustart angefangener Transcoding-Filme und Tonwechsel sind durch den aktuellen Such-/Bestätigungsablauf ersetzt. Beide Quellenarten versuchen die gespeicherte Filmposition wiederherzustellen, Fortschritt wird erst nach bestätigtem Sprung gemeldet. Dies ist mit AVPlay-Simulation geprüft. Die echte HLS-Zeitbasis und Codec-Freigaben bleiben Geräteprüfungen. Profilwechsel validiert die Zielanmeldung vor Austausch und erhält das aktuelle Profil bei Ausfall oder ungültiger Zielsitzung.
