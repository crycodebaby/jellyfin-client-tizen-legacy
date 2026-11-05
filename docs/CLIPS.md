# Persönliche Clips – aktueller Stand

Stand 5. November 2026. Die Clips werden vom Begleitdienst erstellt und liegen zentral im privaten, lokal konfigurierten Clip-Verzeichnis. Der tatsächliche Pfad steht ausschließlich in .private/clip-settings.local.json.

## Datenmodell

Ablage als root / Jellyfin-Benutzer-ID / Film-ID / Clip-ID.mkv und Clip-ID.json. Die Metadaten enthalten Quelle, Schnittgrenzen, gewählte Tonspur und Erstellzeit. Die Anmeldung autorisiert den tatsächlichen Benutzer über Jellyfin. Ein frei gewählter Anzeigename entscheidet nicht über den Besitzer.

Die Dateien werden nicht automatisch in einer Jellyfin-Bibliothek registriert. Die Eigentümertrennung wird durch die Clip-API durchgesetzt. Wer über das Betriebssystem auf den Clipordner zugreifen kann, kann die Dateien außerhalb dieser API lesen.

## Zugriff

Am TV über Filmdetails → Meine Clips. Dieselbe Jellyfin-Identität kann über mehrere Fernseher dieselben Clips auf demselben Begleitdienst erreichen. Ein anderes Konto erhält diese Clips nicht.

Die Handyoberfläche bietet aktuell weder Clipliste noch Download. Der vorhandene API-Inhaltspfad dient der Wiedergabe mit einem kurzlebigen, an die Netzwerkadresse gebundenen Ticket. Das ist kein dauerhafter Freigabelink.

Der Betreiber kann die MKV-Dateien am PC aus dem Clipordner kopieren und beispielsweise über eine private Dateifreigabe bereitstellen. Eine solche Freigabe muss eigene Rechte erhalten. Es gibt bisher keine geprüfte Downloadfunktion für Familienmitglieder.

## Offene Punkte

- Persönliche Clipübersicht und authentifizierter Download im Handy-Browser.
- Speicherquote je Benutzer, freier Speicher und Fehlerbehandlung bei voller Platte.
- Löschung und Aufräumen alter Clipdateien.
- Migration von Besitzer- und Film-IDs beim Jellyfin-Umzug. Getrennte Server dürfen kein gemeinsames Cliproot mit ungeprüften IDs verwenden.
- Der aktuelle Zugriff verlangt weiterhin Zugriff auf den ursprünglichen Film. Nach Löschung des Films sind vorhandene Clipdateien nicht automatisch über die API zugänglich.
- Neustart kann laufende Aufträge und Wiedergabetickets verwerfen. Fertige Clipdateien und Metadaten bleiben auf dem Datenträger.
- Stream-Copy garantiert keine bildgenauen Schnittgrenzen und keine universelle MKV-Abspielbarkeit in iOS-Browsern.
