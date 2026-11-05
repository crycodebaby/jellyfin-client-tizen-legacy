# Engineering-Audit und Reihenfolge

Stand: 27.10.2026. Ein Testpaket läuft auf dem Ziel-TV; der Nutzer bestätigte erste Navigation sowie Jellyfin-Verbindung, Anmeldung und erste Filme. Phase 0 und weitere Hardwareprüfungen bleiben offen.

Dieses Audit ist eine historische Bestandsaufnahme. Insbesondere der spätere AVPlay-Anschluss und erfolgreiche Wiedergabetests fehlen hier. Für den aktuellen Stand und offene Aufgaben gelten [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) und [TASKS.md](../TASKS.md).

## Befunde

- `app.js` verbindet Beispielbestand, Navigation, Fokus, Rendering, Dialoge, Einstellungen und Netzwerkzustand. Eine zentrale Ereignisbehandlung existiert bereits; ein zweites Navigationssystem wäre kontraproduktiv.
- Karten, Merkliste und Detailansicht verwenden Array-Indizes. Nach Sortierung, Pagination oder aktualisierten Serverdaten sind diese keine stabilen Medienidentitäten. Der Fokus wird überwiegend als DOM-Referenz gespeichert; ein Neuaufbau kann diese ungültig machen.
- `sectionIndexes()` beschränkt die Vorschau auf fünf Karten. Das begrenzt den DOM, bietet aber weder Pagination noch Zugriff auf große Bibliotheken. Die Startseite und Entdecken enthalten zusätzlich feste Beispielindizes.
- Die öffentliche Serverprüfung war direkt mit Dialog, XHR und Zeitgebern gekoppelt. Die HTTP-Schicht trennt Transport und JSON-Parsing; der experimentelle Jellyfin-Client ergänzt Anmeldung und Filmseiten. Die UI verwaltet ihren Ladezustand und verwirft veraltete Antworten. Eine erste authentifizierte Filmansicht auf dem TV wurde vom Nutzer bestätigt; weitere Fälle bleiben offen.
- Die temporäre Merkliste ist sitzungsgebunden und keine Jellyfin-UserData. Die Oberfläche ist ausdrücklich als Beispieldatenvorschau gekennzeichnet.
- Die globale Motion-Listener-Registrierung wird beim Entladen entfernt; Anfragen werden abgebrochen. Wiederholte Seitenwechsel bauen Karten vollständig neu auf. Aussagen zur Speicherlast und Geschwindigkeit auf dem Fernseher sind ohne Gerät nicht möglich.
- Die Runtime-Dateiliste ist explizit und die Internetberechtigung ist im Manifest ergänzt. Ein lokal signiertes Test-WGT wurde installiert und gestartet; die reguläre Paketierung und weitere Geräteprüfungen bleiben offen.

## Priorisierte Umsetzung

1. Transport isolieren und bestehende Verbindungsprüfung mit Fehler-, Timeout- und Abbruchtests absichern. **Begonnen:** `jellyfin-http.js`, Desktop-Tests und Manifestprüfung.
2. Tatsächliche Server-API und Authentifizierungsanforderungen überprüfen; danach Session-Lifecycle, Tokenbehandlung und typisierte Fehler mit realistischen Testantworten implementieren. **Begonnen:** lokales 12.3-Schema, Anmeldung und speichergebundene Sitzung; echte Anmeldung auf dem TV bestätigt, sichere Wiederherstellung offen.
3. Medienmodelle mit stabilen Jellyfin-IDs und einen expliziten Vorschau-Datenanbieter einführen. **Begonnen:** Filmmodell mit stabiler ID und getrennte Filmansicht; indexbasierte Vorschau und Merkliste bleiben bestehen.
4. Daten-Pagination und ein begrenztes Darstellungsfenster samt ID-basiertem Fokus und Rückkehrzustand entwickeln. **Begonnen:** Filmfenster und simulierte große Bibliothek; stabile Reihenfolge bei Änderungen sowie Bild- und Geräteverhalten bleiben offen.
5. Begrenzten Cache, Bildgrößen und Invalidierung anhand echter API-Anforderungen ergänzen. **Begonnen:** zwei kurzlebige Filmseiten im Speicher; reale Server- und TV-Messung offen. Ein isolierter Player-Zustandsautomat mit Testadapter ist vorbereitet; der Vertrag und die ungeprüfte AVPlay-Anbindung müssen vor der Integration weiterentwickelt werden.
6. SDK-Web-CLI und Samsung-Erweiterung separat reparieren; WGT-Inhalt, Signatur, Installation und Laufzeit auf dem Zielgerät einzeln nachweisen.

Die HTTP-Grundlage unterstützt derzeit keine Request-Zusammenfassung oder automatischen Retry. Die Sitzung wird nicht wiederhergestellt. Der Merkliste-Fokus verwendet weiterhin Beispielindizes. Der Nutzer bestätigte erste echte Filme auf dem TV; Navigation durch große Bibliotheken und Änderungen sind dort noch zu prüfen.

Die isolierte Playback-Grundlage wird nur in Entwicklungstests verwendet und nicht mit der TV-Oberfläche ausgeliefert. Ihr vorläufiger Adaptervertrag verlangt Kennungen für Play-, Pause-, Such- und Pufferereignisse, um verspätete Bestätigungen zu unterscheiden. Ob ein späterer AVPlay-Adapter diese Zuordnung auf dem Zielgerät zuverlässig bereitstellen kann, ist ungeprüft; andernfalls muss der Vertrag vor der Integration geändert werden. Die Tests belegen keine Wiedergabe.
