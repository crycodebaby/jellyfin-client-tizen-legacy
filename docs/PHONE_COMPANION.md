# Handy-Verbindung

## Ziel und Stand

Im TV-Profil öffnet „Handy-Verbindung“ einen zeitlich begrenzten QR-Code. Nach dem Scannen kann das Handy nach Filmen und Schauspielern suchen und einen gefundenen Film auf dem Fernseher starten. Eine zusätzliche Jellyfin-Anmeldung am Handy ist nicht nötig.

Ein Prototyp aus TV-Brücke, lokalem Begleitdienst und Handy-Seite ist implementiert. Die Kopplung, Suche, Schauspielerfilme und ein Wiedergabewunsch wurden in Desktop-Tests mit simulierten Jellyfin-Antworten geprüft. Der Nutzer bestätigte auf dem tatsächlichen Handy den erfolgreichen QR-Scan, die Verbindung, die Anzeige der Filmübersicht und die Schauspielersuche. Ein am Handy ausgewählter Film startete auf dem TV mit Bild und Ton. Ein privates TV-Paket wurde gebaut, signiert und laut Tizen-CLI installiert und gestartet. Der Begleitdienst wurde für den Test gestartet; seine Seite und lokale QR-Erzeugung waren vom Computer erreichbar. Die dauerhafte Einrichtung sowie Trennen, Ablauf und erneute Kopplung auf echten Geräten stehen noch aus. Das bedeutet: Die Funktion ist derzeit noch nicht als einsatzbereit bestätigt.

Nach einer später gemeldeten fehlgeschlagenen Kopplung wurde ein noch laufender alter Begleitdienst als Versionskonflikt festgestellt und durch die aktuelle Version ersetzt. Eine lokale Prüfung bestätigte neue Kopplung, QR-Erzeugung, Gerätebezeichnung und Einmaligkeit des Codes. Der Nutzer bestätigte anschließend, dass die Handyverbindung wieder funktioniert. Ein Dienstneustart beendet bestehende Verbindungen; danach muss ein neuer QR-Code am TV geöffnet und gescannt werden.

## Datenfluss

- Der TV bleibt bei Jellyfin angemeldet. Bei der Anmeldung über den TV-QR nimmt der Begleitdienst die Jellyfin-Zugangsdaten einmalig vom Handy entgegen, meldet sich kurz bei Jellyfin an und bestätigt Quick Connect; anschließend wird diese zusätzliche Jellyfin-Sitzung abgemeldet. Für die laufende Verbindung vermittelt der Dienst begrenzte Such- und Wiedergabenachrichten.
- Der QR-Code enthält die Adresse des lokalen Dienstes und einen zufälligen, einmal verwendbaren Kopplungsschlüssel. Dieser Schlüssel ist selbst ein Zugang zur Verbindung und darf nicht protokolliert oder geteilt werden. Er läuft nach zwei Minuten ab und wird nach dem ersten Scannen ungültig.
- Das Handy erhält eine kurzlebige Berechtigung für die Vermittlung; der Jellyfin-Token der kurzzeitigen Anmeldung wird nicht an die Handyseite weitergegeben. Der TV erlaubt Wiedergabewünsche nur für zuvor über die Kopplung gelieferte Film-IDs. Beim Abmelden am TV wird die Kopplung beendet; ein längerer Ausfall des TV beendet sie ebenfalls.
- Nach bestätigter Kopplung kann der Handy-Tab seine Relay-Berechtigung im nicht nachweislich verschlüsselten Tab-Speicher halten und nach Neuladen beim Dienst erneut prüfen. Widerruf und Ablauf löschen sie; ohne Tab-Speicher bleibt die gewöhnliche Kopplung nutzbar. Der Dienst begrenzt auch aktive Sitzungen auf 24 Stunden und verlangt weiterhin beide Lebenszeichen innerhalb von 60 Sekunden. Ob Safari im Hintergrund rechtzeitig antwortet, muss am iPhone geprüft werden.
- Das Profil zeigt die Einladung zu Smairys Connect und nach der Kopplung den übermittelten Gerätenamen. Der Handy-Browser erkennt gegebenenfalls nur die Geräteart (zum Beispiel „iPhone“), nicht zuverlässig das genaue Modell; dieses kann am Handy freiwillig als Name eingegeben werden. Der Name bleibt nur für die laufende Verbindung im Speicher des Dienstes. Bleibt das Handy 60 Sekunden ohne Verbindung zum Dienst, läuft die Sitzung aus; manche Browser pausieren die Seite im Hintergrund. Die Anzeige und der erneute Verbindungsaufbau sind auf echten Geräten noch zu prüfen.
- `companion/relay.cjs` stellt die Handy-Seite und den Vermittler bereit. Die QR-Grafik wird lokal durch `companion/qr.py` mit Python und ReportLab erzeugt; keine externe QR-Website oder CDN wird benötigt. `scripts/start-phone-companion.ps1` bereitet den Start als versteckten lokalen Prozess vor. Der Dienst läuft nicht automatisch nach einem Computer-Neustart.
- Standardmäßig leitet der TV den Connect-Host aus seiner editierbaren Jellyfin-Adresse ab und verwendet Port 8787. Ein lokales Mapping kann die Adresse [überschreiben](SERVER_CONNECTIONS.md). Der vorbereitete Startweg unterstützt zunächst einen lokalen Jellyfin-Server über IPv4 und HTTP auf demselben Computer.

Die Datenübertragung erfolgt derzeit über HTTP im lokalen Netzwerk und ist **nicht verschlüsselt**. Wer den QR-Code oder den einmaligen Kopplungsschlüssel mitliest, kann während seiner Gültigkeit die Verbindung übernehmen und Filme auf dem TV starten. Die Architektur ist nur für ein vertrauenswürdiges lokales Netz vorgesehen; TLS, dauerhafte Einrichtung und umfassende Sicherheitsprüfung bleiben offen.

## Prüfstand und weitere Schritte

1. Die lokale Testsuite prüft einmalige und abgelaufene Kopplungen, begrenzte Ereignisse, Abmeldung, unerlaubte Ursprünge, die mobile Suche, Schauspieler und einen Wiedergabewunsch an einen simulierten TV-Player.
2. Den Begleitdienst im gewünschten Netzwerk starten und seine Erreichbarkeit von TV und Handy prüfen; Firewall und passende lokale Adresse können dies verhindern.
3. Bei Änderungen ein passendes privates WGT prüfen und installieren. QR-Scan, Filmübersicht, Schauspielersuche und Filmstart wurden bereits bestätigt; Abbruch, Trennen, Ablauf und erneute Kopplung bleiben auf echten Geräten zu prüfen.
4. Automatische Bereitstellung nach PC-Neustart und verschlüsselten Transport gezielt entscheiden. Keine Zugangsdaten, Mediennamen, Kopplungsschlüssel oder Geräteadressen protokollieren.

## Quellen

- [Samsung: Tizen Web Device APIs für TV](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references.html?device=htv)
- [Jellyfin: Quick Connect](https://jellyfin.org/docs/general/server/quick-connect/). Die Anmeldung über den TV-QR verwendet vorübergehend eine zusätzliche Jellyfin-Sitzung zur Freigabe.

## Persönliche Filmclips

Die optionale lokale Konfiguration .private/clip-settings.local.json aktiviert den Clipdienst und legt Jellyfin-Adresse, zulässige Medienwurzeln, FFmpeg und die separate Clipablage fest. Sie gehört nicht ins Repository. Der Start über scripts/start-phone-companion.ps1 lädt sie, wenn vorhanden. Der Dienst startet weiterhin nicht automatisch nach einem PC-Neustart.

Für jeden Auftrag, Katalogzugriff und jede Dateianfrage prüft der Dienst den Jellyfin-Benutzer und dessen Zugriff auf den Film. Dateien liegen getrennt nach Benutzer und Film; Pfade kommen ausschließlich vom Server. Ein kurzes, an den Netzwerkclient gebundenes Wiedergabeticket verbleibt höchstens zehn Minuten im Speicher. Die vorhandene HTTP-Verbindung überträgt auch den Jellyfin-Sitzungstoken unverschlüsselt und schützt nicht vor Mitlesen im lokalen Netz.

Nur lokale DirectPlay-Filme bis fünf Minuten werden unterstützt. FFmpeg kopiert Video und ausgewählte Tonspur; der tatsächliche Anfang kann von der gesetzten Position abweichen. Ein Auftrag läuft gleichzeitig, weitere werden begrenzt eingereiht. Die Integration ist mit synthetischen Medien, echtem FFmpeg und simuliertem Jellyfin getestet; echte Medien und der Ziel-TV müssen separat bestätigt werden.
