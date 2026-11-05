---
name: smairys-tv-taste
description: Analyse und Gestaltung der Smairys-TV-Oberfläche mit Fokus-Maps, visuellen Varianten und überprüfbaren Fernbedienungsabläufen für Samsung Tizen 2.4.
---

# Smairys TV Design Engineering

Verbessere die Familienmediathek für den Moment, in dem jemand einen Film finden, fortsetzen oder entspannt entdecken möchte. Der heutige Bildschirm ist ein Ausgangspunkt, keine verbindliche Designvorlage.

## Relevanten Kontext laden

- [Projektkontext](docs/PROJECT_CONTEXT.md): Produkt, Technik und Prüfgrenzen.
- [Fokus-Maps](docs/TV_FOCUS_MAPS.md): tatsächliches Verhalten und Abweichungen.
- [TV-UX-Analyse](docs/TV_UX_REVIEW.md): Belege und priorisierte Verbesserungen.
- [Designwerkzeuge](docs/DESIGN_TOOLING.md): externe Skills und ihre Grenzen.

Nur relevante Abschnitte und Quellstellen laden. Maps bei Navigationsänderungen abgleichen; sie sind keine zweite Implementierung.

## Drei Arten von Vorgaben

**Technische Grenzen:** Samsung UE65KU6099, 65 Zoll, Tizen 2.4.0, WebKit r152340, logische 1920 × 1080 Pixel. ES5, kein Framework, Bundler oder Laufzeit-CDN. Aktuelle Browserfähigkeiten niemals aus der Desktop-Vorschau ableiten. CSS-Variablen, Grid, WAAPI, `@starting-style`, moderne Selektoren und Polyfills sind keine automatisch erlaubte Basis.

**Produktwünsche:** wenige Tastendrücke, unmittelbare Reaktion, erkennbare Poster und Personen aus ungefähr 5–6 Metern. Kein Trailer-Autoplay oder ständig wechselnder Hintergrund. Serien standardmäßig unsichtbar. Jahr auf Filmkarten erhalten; Endzeit kurz als „Endet um … Uhr“. Persönliche, freche Begrüßungen sind gewünscht. Kürze Fülltext, ohne Humor, nötige Labels oder hilfreiche Fehlermeldungen pauschal zu löschen.

**Veränderbare Gestaltung:** Palette, Akzent, Sidebar, Kopfbereich, Rundungen, Kartenformen, Abstände, Typografie und Dialogaufbau dürfen sich verbessern. Markenassets und Lizenzgrenzen beachten. Bestehende Tokens konsistent weiterentwickeln; ihre heutigen Werte sind kein unveränderlicher Standard.

## Vor dem Entwurf

1. Konkrete Nutzeraufgabe und Einstieg benennen: etwa „angefangenen Film fortsetzen“, nicht „Startseite modernisieren“.
2. Aktuellen Bildschirm im TV-Format ansehen. Reale Titellängen und Bildformate prüfen; für gespeicherte Belege synthetische Daten bevorzugen. Private Medien, Sitzungen und Screenshots nicht in Git aufnehmen.
3. Fokuswege erfassen: Eintritt, vier Richtungen, OK, Zurück, Ränder, Wiederherstellung und asynchrones Laden.
4. Beobachtung, Quellcode-Ableitung und Vorschlag unterscheiden. Ein Screenshot beweist weder korrekte Bedienung noch TV-Kompatibilität.

Bei größeren Änderungen zwei unterschiedliche Kompositionen skizzieren. Anhand Nutzeraufgabe, Lesbarkeit, Fokuswegen und Plattformkosten vergleichen und begründet wählen. Keine selbst vergebenen „90/100“ als Abnahme.

## Fernbedienung als Entwurfsgrundlage

- Genau ein sichtbarer Fokus. Aktiver Bereich, fokussierte Aktion und gewählter Filter bleiben unterscheidbar.
- Fokus folgt der sichtbaren Geometrie. Keine lineare DOM-Navigation für ein räumliches Raster.
- Links vom ersten Film führt zur Sidebar. Rechts darf zur nächsten Filmgruppe weiterführen; Auf/Ab erhalten möglichst die Spalte. Sammlungs- und Dialogkontext bei Zurück ausdrücklich planen.
- Start + oben erreicht Profil. Hauptnavigation und Filter bleiben kurz erreichbar.
- Schließen stellt den auslösenden Fokus wieder her. Fehlt das Element, einen sichtbaren sinnvollen Ersatz wählen.
- Laden, Fehler, leere Ergebnisse und Profilwechsel berücksichtigen. Späte Antworten dürfen den gerade gewählten Fokus nicht überraschend übernehmen.
- Filter ohne Tastatur ermöglichen. Auswahl sichtbar machen; Anwenden und Zurück ohne Durchlaufen der gesamten Liste erreichbar planen.
- TV-Tastatur ist Systemoberfläche. Verfügbare Höhe und Eingabefokus berücksichtigen, nicht die gesamte Bühne verzerren.

## Visuelle Entscheidungen

Poster, Portrait und Hauptaktion bilden die Hierarchie. Sammlungen müssen als Sammlungen erkennbar sein. Kontext wie ein geöffneter Sammlungsname darf nicht unter pauschalem Minimalismus verschwinden.

**Filmplakate bleiben vollständig frei.** Titel, Jahr, „Gesehen“, Fortschrittsbalken, Medientypen und Aktionen stehen außerhalb der Bildfläche. Das gilt auch bei Fokus, im Ladezustand und in Vorschauzeilen. Der Fokusrahmen liegt um das Bild. Prüfe die Bildgrenze in der 1080p-Vorschau bei Karten mit und ohne Status.

Nicht jede Aktion verdient die gleiche Fläche oder Akzentfarbe. Abmelden soll nicht mit Fortsetzen oder dem aktiven Profil um Aufmerksamkeit konkurrieren. Rundungen nach Rolle gestalten; identische Schaltflächenstapel sind keine Standardlösung für jede Aufgabe.

Für 1080p zunächst etwa 24–28 px für Kartentitel und wichtige Labels, 30–34 px für Reihenüberschriften und 44–64 px für Haupttitel prüfen. Startwerte sind keine Lesbarkeitsgarantie. Kleinere Sekundärdaten begründen und am TV prüfen. Lange Titel, fehlendes Jahr oder Portrait, viele Genres und wenige Treffer gehören zum Entwurf.

## Geschwindigkeit und Bewegung

Eingaben sofort verarbeiten; Animation darf keine weitere Eingabe sperren. Wiederholte Fokusbewegungen brauchen keine aufwendige Animation. Übergänge nur für räumliche Orientierung oder Zustandswechsel. Vorhandene Modi Voll/Reduziert/Aus respektieren.

Gezielte DOM-Updates und skalierte Bilder bevorzugen. Kein vollständiger Seitenneubau pro Tastendruck. Kein Blur, Partikel oder gestaffeltes Anzeigen von Karten als automatische Premium-Behandlung. Transform und Opacity sind mögliche Mittel, kein Nachweis für GPU-Ausführung auf dem TV.

Synchrone Fokuslogik, nächster Frame, Netzwerkladen und wahrgenommene TV-Reaktion getrennt messen. Desktop-Millisekunden nicht als TV-Latenz bezeichnen. Externe Motion-, Spring-, Hover- und Touch-Rezepte auf den Nutzen für dieses Gerät prüfen.

## Nachweis und Abschluss

Geänderten Ablauf mit Pfeiltasten, OK und Zurück prüfen, nicht nur mit der Maus. Zustände: Erststart, gespeicherte Sitzung, leer, ladend, Fehler, Rückkehr und lange Inhalte. Player und Bildschirmtastatur zusätzlich am Gerät abnehmen.

Bei Codeänderungen passende Verhaltenstests ausführen. Bei Dokumentänderungen Links und Widersprüche prüfen. Fehler mit Einstieg, Tastensequenz, Erwartung und Ergebnis dokumentieren. Tests nur für sinnvolle Verhaltensgarantien ergänzen.

Berichte konkrete Erkenntnisse oder Änderungen, Nachweis, Grenzen und nächste Priorität. Entwurf, umgesetzt, Desktop-geprüft und TV-bestätigt unterscheiden. Ein Analyseauftrag ist keine Freigabe für ungeprüfte Änderungen an Anmeldung oder Wiedergabe.
