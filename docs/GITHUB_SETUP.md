# GitHub: Veröffentlichung ohne externe Beiträge

Das öffentliche Repository wurde unter [crycodebaby/jellyfin-client-tizen-legacy](https://github.com/crycodebaby/jellyfin-client-tizen-legacy) erstellt. Die Einstellungen können nicht durch Dateien im lokalen Projekt erzwungen werden und müssen auf GitHub geprüft werden.

**Stand 27.10.2026:** Der bereinigte Veröffentlichungszweig wurde als `main` hochgeladen. Issues, Pull Requests, Discussions und Wiki sind deaktiviert. Bei der Prüfung war `crycodebaby` der einzige Collaborator. Ein zusätzliches Branch-Ruleset ist noch nicht eingerichtet; Kommentare an einzelnen Commits waren in der Oberfläche noch aktiviert. Einstellungen können sich ändern und sollten erneut geprüft werden.

## Vor dem Push

1. Den vorbereiteten Veröffentlichungsstand und seine gesamte erreichbare Git-Historie auf private Daten und persönliche Commit-E-Mail-Adressen prüfen. `npm run check:public -- github-ready` prüft häufige Muster und alle erreichbaren Commit-E-Mails; eine manuelle Prüfung bleibt erforderlich. Nur den eigens bereinigten Branch `github-ready` veröffentlichen, nicht ältere lokale Entwicklungsbranches.
2. Dateien wie Tokens, `.env`, Zertifikate, Schlüssel, Geräteeinstellungen, Logs, lokale Datenbanken und WGT-Builds aus dem Repository heraushalten. `.gitignore` schützt nur nicht erfasste Dateien; bereits verfolgte Dateien und frühere Commits müssen gesondert geprüft werden.
3. MIT für Code und Dokumentation sowie die Ausnahme der drei Smairys-Logos in `LICENSE`, `README.md` und `branding/README.md` prüfen.
4. Das Repository als öffentliche Entwicklungsvorschau kennzeichnen. Ein installierbares WGT oder eine bestätigte TV-Kompatibilität liegen noch nicht vor.

## Einstellungen nach der Erstellung

1. **Settings → General → Features:** **Issues**, **Pull requests**, **Discussions** und **Wikis** deaktivieren, sofern die Optionen in der Oberfläche angeboten werden. [GitHub: Issues deaktivieren](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/disabling-issues), [Pull Requests deaktivieren](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/disabling-pull-requests), [Discussions deaktivieren](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/enabling-or-disabling-github-discussions-for-a-repository).
2. Unter **Settings → Collaborators** beziehungsweise **Manage access** keine externen Personen oder Teams mit Schreibrechten hinzufügen; vorhandene Berechtigungen prüfen.
3. Einen Branch-Ruleset für die Veröffentlichungsbranches einrichten: Erstellen, Ändern und Löschen auf berechtigte Bypass-Akteure beschränken; nur dem Inhaber beziehungsweise den zuständigen Administratoren Bypass gewähren. Vorher prüfen, dass der Inhaber weiterhin pushen kann. [GitHub: Regeln für Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
4. GitHub Actions nur für den eigenen `push` und manuelle Auslösung verwenden. Der vorbereitete Workflow hat keine Pull-Request-Auslösung und benötigt keine Projektgeheimnisse.
5. Nach dem Speichern die Repository-Seite und die Einstellungen mit einem nicht angemeldeten Fenster beziehungsweise einem Konto ohne Schreibrechte prüfen.

**Grenze:** Bei einem öffentlichen Repository können andere den Quellcode lesen, herunterladen und auf GitHub forken. Ein Fork ist ein eigenes Repository und ändert das Original nicht. GitHub bestätigt, dass öffentliche Repositories geforkt werden können. [GitHub: Forks](https://docs.github.com/en/pull-requests/reference/forks)

Die MIT-Nutzung des Codes bleibt möglich. Die Smairys-Logos sind nicht unter MIT lizenziert und müssen für eigene Marken ersetzt werden.
