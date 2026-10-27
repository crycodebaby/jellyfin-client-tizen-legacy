# Bewegung, Laden und Diagnose

Die Oberfläche ist weiterhin eine Vorschau mit Beispieldaten. Die folgenden Funktionen wurden im Desktop-Browser geprüft; ihre Darstellung und Leistung auf dem Ziel-TV sind offen.

## Bewegungsmodi

Im Verbindungsdialog stehen **Voll**, **Reduziert** und **Aus** zur Auswahl. Die Auswahl wird, soweit verfügbar, lokal gespeichert. Ohne gespeicherte Auswahl wird die Systemvorgabe berücksichtigt; wenn sie nicht zuverlässig ermittelt oder die Speicherung nicht gelesen werden kann, startet die App reduziert. Eine ausdrückliche Auswahl hat Vorrang. Navigation und sichtbarer Fokus ändern sich sofort und warten nicht auf Animationen.

`motion.css` enthält die gemeinsamen Zeiten und die Modi. Voll nutzt kurze Bewegungen für Fokus, Seiten und Dialoge; reduziert beschränkt Bewegung und zeigt die Ladeanzeige statisch. Aus schaltet Animationen und Übergänge ab. CSS-Variablen werden nicht vorausgesetzt, CSS-Eigenschaften für ältere WebKit-Versionen sind zusätzlich mit Präfix angegeben. Das ersetzt keinen Test auf dem Fernseher.

## Verbindungsprüfung

Der Orbit erscheint erst nach 200 ms bei einer noch laufenden Verbindungsprüfung. Eine zweite Prüfung währenddessen wird verhindert. Erfolg, Fehler und Zeitüberschreitung beenden den Ladezustand. Beim Verlassen des Dialogs oder Ändern der Adresse wird die Anfrage abgebrochen und ihre spätere Antwort verworfen. In den Modi Reduziert und Aus bleibt die Anzeige statisch.

Weitere Ladezustände für echte Bibliotheken werden erst mit deren Anbindung benötigt. Virtualisierung und verzögertes Laden von Bildern sollen anhand von Messungen auf dem Zielgerät entschieden werden; die jetzigen kleinen Beispielreihen belegen dafür keinen Bedarf.

## Lokale Diagnose

Mit `npm run preview` starten und `http://127.0.0.1:8000/?diagnostics=1` öffnen. In der Browserkonsole liefert `window.SMAIRYS_DIAGNOSTICS.snapshot()` lokale Zeitereignisse und die Anzahl sichtbarer Karten; `window.SMAIRYS_DIAGNOSTICS.clear()` leert den begrenzten Puffer. Speicherangaben und Long-Task-Ereignisse sind nur verfügbar, wenn der jeweilige Browser sie unterstützt. Ohne diesen URL-Parameter ist die Diagnose ausgeschaltet. Sie versendet keine Daten und speichert keine Serveradresse oder Zugangsdaten.

Die Ereignisse erfassen unter anderem DOM-Aktualisierungen und einen angeforderten Frame-Callback. Dieser Callback belegt nicht, wann ein Bild tatsächlich sichtbar wurde. Für belastbare Aussagen sind Messungen direkt auf dem TV nötig.

## Desktop-Prüfung und Grenzen

`npm test` prüft unter anderem schnelle Richtungswechsel, Bewegungseinstellungen, Verbindungsabbruch, Fehler und Zeitüberschreitung. `npm run screenshot:motion` erstellt unter `.build/motion-preview.png` eine lokale Vorschau mit künstlich verzögerter Testantwort; `.build` wird nicht veröffentlicht.

`npm run measure:navigation` misst 30 synthetische, abwechselnde Tastendrücke in einem Headless-Desktop-Chromium. In je einem isolierten Lauf lagen die synchronen Bearbeitungszeiten vor der Änderung bei durchschnittlich 0,28 ms, p95 0,30 ms und maximal 2,20 ms; danach bei durchschnittlich 0,10 ms, p95 0,20 ms und maximal 0,50 ms. Diese Einzelmessungen sind durch die Zeitauflösung begrenzt und weder ein belastbarer Leistungsvergleich noch eine Messung sichtbarer Bildausgabe, Seitenwechsel oder TV-Reaktionszeit.

Der Versuch mit der installierten Tizen-CLI scheiterte weiterhin bei 80 % an `NoClassDefFoundError: org/eclipse/core/runtime/Plugin`; `sdb devices` zeigte kein Gerät. Ein WGT-Build und eine Prüfung der Animationen, Fernbedienung, Speicherlast und Netzwerkabbruch auf dem Fernseher stehen aus.
