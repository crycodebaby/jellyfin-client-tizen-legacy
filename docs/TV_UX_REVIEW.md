# TV-UX-Analyse vom 5. November 2026

Diese Datei dokumentiert den damaligen Audit mit Beobachtungen und Vorschlägen. Für aktuelle Bedienwege gelten die [Fokus-Maps](TV_FOCUS_MAPS.md), für offene Arbeit [TASKS.md](../TASKS.md).

Ausgangsaudit: 5. November 2026, App-Quellstand 0.1.41. Die Tabelle hält den damaligen Zustand fest. Den aktuellen Bedienstand beschreiben die [Fokus-Maps](TV_FOCUS_MAPS.md).

In der lokalen Vorschau sind UX-01, UX-04, UX-05 und UX-11 umgesetzt. UX-02 ist in Entdecken mit Filmzahl und Buchstabenauswahl umgesetzt. UX-12 ist bei der Anzeige typischer technischer Titelendungen in „Zuletzt hinzugefügt“ abgedeckt. Fehlende oder falsche Zuordnungen in Jellyfin sowie die Geräteprüfung sind offen.

## Methode und Grenzen

Die vorhandene Webvorschau wurde angemeldet im logischen TV-Format 1920×1080 geprüft: Start, Filme, Profil, Einstellungen, Schauspielerfilter, Filmdetail, Personenseite, Sammlungsübersicht, Sammlungsinhalt, Entdecken und Genre-Dialog. Screenshots, DOM und gezielte Pfeiltasten wurden gemeinsam verwendet. Suche wurde strukturell angesehen, aber nicht mit einem Suchbegriff durchgespielt. Keine neue Anmeldung, Profilanlage, Filmwiedergabe, Clip-Erzeugung oder Fortschrittsänderung auf dem echten Server.

Das Verhalten wurde mit `move`, `keydown`, `renderSection`, den betreffenden Dialogfunktionen und CSS abgeglichen. [Fokus-Maps](TV_FOCUS_MAPS.md) kennzeichnen Browserbeobachtung, Quellcode und Tests getrennt. Vollständige Zustandsabdeckung ist damit nicht erreicht. Lesbarkeit aus Sitzabstand, native Tastatur und Tizen-Reaktion bleiben Geräteprüfungen.

Persönliche Bibliotheksdaten und Kontonamen wurden nicht in diesen Bericht übernommen. Eine separat erzeugte Demonstrationsaufnahme liegt lokal unter `.build/ui-review/preview.png` und wird nicht versioniert. Sie belegt die Funktionsfähigkeit des Screenshotwerkzeugs, nicht den angemeldeten Zustand oder die folgenden Einzelbefunde.

## Was erhalten bleiben sollte

- Große Poster, Jahresbadges und erkennbare Fortschrittsbalken unterstützen die Filmwahl.
- Begrüßung, Zeitbezug und persönliche Mikrotexte geben der Startseite Charakter. Nicht zugunsten generischer Marketingtexte entfernen.
- Start + oben → Profil und links vom ersten Film im Sammlungsinhalt → Sidebar wurden bestätigt.
- Die Schauspielerauswahl besitzt echte Portraits und korrektes vertikales Navigieren im Dreierschema.
- Filmdetail tritt auf der Hauptaktion ein; Besetzung ist direkt mit unten erreichbar. Zusätzliche Besetzung ist mit Zähler und Pfeilen erkennbar.
- Bewegung lässt sich bereits reduzieren oder ausschalten. Kein neues Effektpaket nötig.

## Konkrete Kritik und Zielverhalten

Prioritäten: P1 = erschwert eine Kernaufgabe; P2 = Orientierung oder visuelle Qualität; P3 = spätere Verfeinerung. Dies ist eine qualitative Priorisierung, keine statistische Benutzermessung.

| ID | Vorher / beobachteter Stand | Nachher / vorgeschlagenes Ziel | Warum und Beleg |
| --- | --- | --- | --- |
| UX-01 P1 | Genres und Fußaktionen bilden eine lineare Fokuskette. | Anwenden aus der Auswahlliste mit einer Richtungstaste erreichen; gemerkter Rückweg. | Bei N Genres N+1 Schritte vom ersten Genre bis Anwenden. Browser + `moveWithin`, `openGenreFilter`. |
| UX-02 P1 | Portraitfilter beginnt alphabetisch; nur sechs Personen je Seite bei sehr großem Bestand. | Kontextbezogene Einstiegsgruppe, dann A–Z-Sprung und weitere Seiten. Drei Portraitspalten erhalten. | Ohne Tastatur wird Auffinden bekannter Personen weiterhin zum langen Blättern. Browser + `searchCollectionActors`. |
| UX-03 P1 | Nach schneller Rechts-Eingabe während des Seitenladens kann Fokus auf Profil ausweichen. | Sichtbares Ladeziel bzw. gespeicherte Inhaltsabsicht; Fokus nach Antwort nur übernehmen, wenn Nutzer nicht weiter navigiert hat. | In einer schnellen Eingabesequenz beobachtet; `activeCards()[0]`-Fallback auf Profil. Gezielter verzögerter Regressionstest noch offen. |
| UX-04 P2 | Aktives Profil, Hinzufügen, Abmelden, Connect und Einstellungen als breite vertikale Schaltflächen; Hinzufügen und Abmelden beide orange. | Profile visuell als Identitäten gruppieren, Dienstaktionen sekundär, Abmelden zurückhaltend. | Konkurrenz der Akzentaktionen im Screenshot; `profile-actions`, `auth-logout` hat `action-primary`. |
| UX-05 P2 | Der Name der geöffneten Sammlung fehlt sichtbar, obwohl er im Datenmodell vorhanden ist. | Kurzer Sammlungstitel und kompakter Kontext, ohne zusätzliche Textwand. | `renderSection` setzt `page-title`, aber `.page-heading { display: none; }`. Im Sammlungsinhalt sichtbar bestätigt. |
| UX-06 P2 | Filme und Entdecken zeigen dieselbe alphabetische erste Filmauswahl; Entdecken ergänzt Filter. | Entdecken mit sinnvollen Einstiegen wie kurzer Laufzeit, ungeschaut oder Personen; konkrete Auswahl ohne Zufallsversprechen. | Zwei Bildschirme im Browser verglichen. Die Bereiche unterscheiden sich derzeit überwiegend über Filter. |
| UX-07 P2 | Großer Abstand zwischen Kopfzeilenfiltern und erster Filmreihe. | Obere Fläche für Kontext und früher beginnende Poster nutzen; zwei Kompositionen vergleichen. | Posterbeginn in der beobachteten Ansicht ungefähr y=414. Nicht jede freie Fläche muss gefüllt werden. |
| UX-08 P2 | Personen-Rückweg heißt auch nach Einstieg aus Filmbesetzung „Zurück zur Suche“. | Beschriftung und Rückkehr passen zum Ursprung: etwa „Zurück zum Film“. | Browser + `actorOrigin`, `actor-back` in `renderSection`. Funktion und Beschriftung getrennt prüfen. |
| UX-09 P2 | Filtertexte haben 19 px und maximal 235 px Breite; lange Zustände werden abgeschnitten. | Gewählte Filter verständlich zusammenfassen, vollständige Werte im geöffneten Filter erhalten; Größe aus Sitzabstand prüfen. | `styles.css`, `.library-filters .action-button`. Kein pauschaler Platzverbrauch für alle denkbaren Filter. |
| UX-10 P2 | Lange Beschreibungen bilden im Detail einen eigenen Textscrollbereich mit nativer Scrollleiste; dazu existiert Beschreibung als separate Aktion. | Kurze Vorschau plus klarer Lesedialog, ohne konkurrierende Scrollmodelle. | Detail-Screenshot und `detail-text-scroll`/`detail-read`. Die vollständige Beschreibung bleibt erreichbar. |
| UX-11 P2 | Fußaktion im Schauspielerfilter + oben springt immer auf die erste Karte der letzten Reihe. | Zuletzt genutzte Karte bzw. passende Spalte wiederherstellen. | Im zweiten Browserlauf bestätigt: unten Mitte → „Weitere“ → unten links. Entspricht dem `collection-actor`-Zweig. |
| UX-12 P3 | Nicht zugeordnete Metadaten können dateiartige Titel und fehlende Angaben ergeben. | Robuster Umbruch und zurückhaltende Fallbacks; fehlerhafte Jellyfin-Metadaten dort berichtigen. | Startseite mit realen unterschiedlichen Titellängen geprüft. Keine vermeintlich richtigen Filmtitel aus Dateinamen erfinden. |

## Gestaltungsrichtungen für den nächsten Entwurf

**A: Ruhige Bibliothek.** Bestehende Sidebar bleibt, Filter und Sammlungskontext bilden einen kompakten Kopf. Poster beginnen höher, Seitenwechsel und Fokus bleiben stabil. Profil als eigenes Identitätsmenü mit untergeordneter Dienstleiste. Vorteil: begrenzter Umbau und wenig neue Navigationslogik. Risiko: Entdecken bleibt ohne eigene Inhaltsidee zu nah an Filme.

**B: Film zuerst.** Der fokussierte Film erhält eine ruhige Kontextfläche mit größerem Titel und einer kurzen Metazeile; darunter Posterreihe und nach Bedarf Filter. Keine automatisch wechselnden Hintergrundbilder. Vorteil: stärkere Identität und bessere Lesbarkeit des gewählten Films. Risiko: zusätzliche Bildarbeit, weniger gleichzeitig sichtbare Poster und stärkere Änderungen an Fokus- und Seitenaufbau.

Empfehlung: zuerst A für Bibliothek, Sammlungen und Profil umsetzen. B mit synthetischen Medien als begrenzte Variante vergleichen, bevor Bildwechsel oder DOM-Arbeit eingeführt werden. Die Wahl begründet sich aus Bedienbarkeit und Plattformkosten, nicht aus einem generischen Apple-Stil.

## Konkrete Umsetzungspakete und Abnahme

### Paket 1: Filter ohne Umwege

UX-01, UX-02 und UX-11 zusammen bearbeiten. Genre-Entwurf bleibt bis Anwenden lokal, Escape verwirft ihn. Fußleiste räumlich separat navigieren. Schauspieler weiterhin drei Spalten; kurze relevante Auswahl vor alphabetischem Gesamtbestand. Relevanz nur aus tatsächlich verfügbaren Jellyfin-Daten oder nachvollziehbarer lokaler Nutzung ableiten, keine erfundene Popularität.

Akzeptanz: Aus jedem Genre in höchstens einem Richtungsschritt zu Anwenden und von dort zurück zum gemerkten Eintrag. Bekannte Darsteller ohne Texteingabe finden. Für alphabetische Sprünge klaren Buchstaben und Ergebniszahl zeigen. Kein Fokusverlust bei letzter Teilseite, keinen Ergebnissen oder Fehlern. Aktive Auswahl nach Abbrechen unverändert. Tests mit mehreren Genres, drei Spalten, Teilseite und verzögerter Antwort.

### Paket 2: Profil und Sammlungskontext

UX-04, UX-05 und UX-08. Profilavatar und Name bilden die Identität; Wechseln, Connect und Einstellungen haben erkennbar verschiedene Rollen. Abmelden bleibt erreichbar, dominiert aber nicht. Sammlung mit ihrem Namen sichtbar; Ursprung einer Personenseite für Rückweg nutzen.

Akzeptanz: Ein und mehrere gespeicherte Profile, langer Name und fehlendes Portrait funktionieren. Profilwechsel bleibt durch bestehende Sitzungstests abgesichert. Schließen führt zum vorherigen Fokus zurück. Keine automatische Abmeldung oder neues Konto für einen Designwechsel. Sammlungsname bleibt bei Filterung sichtbar und lange Namen verdrängen Profil/Filter nicht.

### Paket 3: Ladezustände und räumliche Hierarchie

UX-03, UX-06, UX-07, UX-09 und UX-10. Vor Layoutänderungen zwei Skizzen mit langen und kurzen Titeln, zwei Sammlungsfilmen und vollem Bestand erstellen. Mehrere unabhängige Scrollmodelle im Detail vermeiden. Nicht jedes Inhaltsladen durch neue Animation kaschieren.

Akzeptanz: Schnelle Folgeeingaben vor und nach einer langsamen Serverantwort; Ausfall, Wiederholung und null Treffer. Weder Seitenleistenfokus noch eine neue bewusste Auswahl werden von einer alten Antwort überschrieben. Filter in 1080p lesbar; abschließende echte TV-Abnahme aus Sitzabstand.

## Prüfung dieser Arbeitsrunde

- Zweiter Audit mit Product Design: Start + oben → Profil und Escape zurück zum Profilknopf bestätigt. In Entdecken vom ersten Genre bis „Anwenden“ 20 Richtungstastendrücke gezählt; Escape führt zum Genrefilter zurück. Schauspieler-Rücksprung von der Fußleiste in die falsche Spalte reproduziert. Sechs Aufnahmen und Schrittprotokoll lokal in `.build/ui-review/product-design/`. Keine Filter angewendet oder Profilaktionen ausgelöst.

- Zehn ausgewählte Verhaltenstests bestanden, kein Fehler, kein Skip: horizontale Bibliotheksnavigation, Login mit Passwort/QR und Fehlern, Wiederherstellung nach kurzem Ausfall, gespeicherte Profile, horizontale Playersteuerung. Testdateien in [Fokus-Maps](TV_FOCUS_MAPS.md).
- Das bestehende Navigationsmesswerkzeug lief zunächst in einen Timeout: Es öffnete die reguläre Anmeldeseite statt der Demonstration. Einstieg in `measure-navigation.cjs` und `capture-preview.cjs` auf `?preview=1` korrigiert. Screenshotwerkzeug um explizites `--output` mit Überschreibschutz erweitert.
- Danach 30 synthetische Sidebar-Eingaben: mittlere synchrone Verarbeitung ungefähr 0,12 ms, p95 ungefähr 0,20 ms, Maximum ungefähr 0,80 ms. Nur Desktop-JavaScript in diesem Lauf; keine Darstellungslatenz und keine TV-Geschwindigkeitszusage.
- Demonstrationsaufnahme erfolgreich erzeugt. Beispielansicht ist nicht der angemeldete Betrieb und kann andere Inhalte enthalten.
- Kein neues WGT gebaut, keine App installiert und keine Nutzerabnahme am TV durchgeführt.

Offene Geräteprüfungen: TV-Tastatur während Login, Lesbarkeit, lange Eingabewiederholung, Filmstart/Fortsetzen, Ton/Untertitel, Clips und Rückkehr aus nativer Wiedergabe. Diese Analyse hebt bestehende Freigabegrenzen nicht auf.
