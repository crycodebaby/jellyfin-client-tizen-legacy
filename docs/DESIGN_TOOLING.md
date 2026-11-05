# Designwerkzeuge für die TV-App

Stand: 5. November 2026. Werkzeuge unterstützen Entwurf und Kritik; sie ersetzen keine Geräteabnahme. Die Methode steht in [SKILL.md](../SKILL.md). In dieser Runde wurde die UI analysiert, nicht neu gestaltet oder auf dem Fernseher installiert.

## Installiert und gelesen

Zwei externe Skills wurden über den Codex Skill Installer lokal installiert. Ab dem nächsten Turn sind sie automatisch auswählbar. Für die aktuelle Analyse wurden ihre Texte bereits gelesen. Keine Kopie oder Laufzeitabhängigkeit im Projekt.

- [Frontend Design von Anthropic](https://github.com/anthropics/skills/tree/main/skills/frontend-design): gestalterische Richtung, echte Inhalte, Typografie und Selbstkritik. Letzte Änderung der Quelldatei bei Abruf: `41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f`. SHA-256 der installierten SKILL.md: `d91970639e9f5c37682ac7ab60094d35f1c7c1f38d731bd56396563aee10c1d3`.
- [Design Engineering von Emil Kowalski](https://github.com/emilkowalski/skills/tree/main/skills/emil-design-eng): unmittelbare Rückmeldung, zurückhaltende Animation und Interaktionsdetails. Letzte Änderung der Quelldatei bei Abruf: `f1090bec277140d02ed202440185ad9d02ac1490`. SHA-256 der installierten SKILL.md: `965cc3108047a1f68e504977ae7816c66115b202a32e7509c0b8305314839c54`.

Die Hashes dokumentieren den geprüften Inhalt. Updates erneut lesen; keine beliebigen Skill-Sammlungen oder Skripte pauschal übernehmen. Fremde Lizenzbedingungen gelten weiterhin.

## Auf Smairys übertragen

Übernehmen: Hierarchie, bewusste Abstände, echte Inhalte, direkte Eingabereaktion, visuelle Nachprüfung.

Nicht ungeprüft übernehmen: React/Motion, CSS-Variablen, WAAPI, `@starting-style`, Blur, Hover und Touch-Muster. Empfehlungen für moderne Browser passen nicht automatisch zu WebKit r152340. Farben sind veränderbar; Hardwaregrenzen bleiben verbindlich.

## Plugins

Product Design ist installiert und wurde für einen zweiten Audit der Profil- und Filterwege eingesetzt. Figma wurde nicht eingesetzt. Die Abbildungen des angemeldeten Clients bleiben lokal unter `.build/ui-review/product-design/`; die Findings stehen ohne persönliche Daten in der [TV-UX-Analyse](TV_UX_REVIEW.md).

Product Design kann bei Varianten und Nutzerwegen helfen. Figma dient editierbaren Entwürfen, ist für die lokale Prüfung keine Voraussetzung. Keine privaten Screenshots, Medienlisten oder Anmeldedaten ohne passenden Auftrag extern hochladen. Ein externer Prototypdienst erreicht die lokale Vorschauadresse nicht automatisch.

## Lokale Werkzeuge

- `npm run preview`: TV-Webvorschau auf Port 8000. `?preview=1` ermöglicht eine Demonstration ohne Anmeldung. Keine mobile Oberfläche.
- Browserwerkzeug: DOM, Screenshots und Pfeiltasten an der geöffneten App. Im logischen 1920×1080-Format prüfen; vorübergehende Fensteranpassung anschließend zurücksetzen.
- Playwright: bestehende isolierte Verhaltenstests mit synthetischen Konten und Medien. Keine privaten Anmeldungen in Testdateien.
- `npm run measure:navigation`: nur synchrone synthetische Desktop-Fokusmessung; keine Netzwerk-, Bildaufbau- oder TV-Latenz.
- Echte TV-Prüfung: Fokus aus Sitzabstand, Bildschirmtastatur, Wiederholrate, native Playerbedienung und wahrgenommene Reaktion.

Die dauerhaften Befunde sind abstrahiert: [TV-UX-Analyse](TV_UX_REVIEW.md), [Fokus-Maps](TV_FOCUS_MAPS.md). Private Medien- und Profilscreenshots gehören nicht in Git.
