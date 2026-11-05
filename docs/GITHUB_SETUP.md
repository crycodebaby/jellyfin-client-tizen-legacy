# GitHub-Publikation

[crycodebaby/jellyfin-client-tizen-legacy](https://github.com/crycodebaby/jellyfin-client-tizen-legacy) ist die öffentliche Quellcode-Vorschau. Die TV-Testpakete bleiben lokal. Externe Beiträge sind während der Entwicklungsphase geschlossen.

## Geprüfte Einstellungen

Am 5. November 2026 war `main` der Standardbranch und nur das Inhaberkonto als Collaborator aufgeführt. Issues, Pull Requests, Discussions, Wiki und Projects sind deaktiviert. Das aktive Ruleset **Protect main history** sperrt Löschen und Force-Push auf `main`. Normale Fast-Forward-Updates bleiben möglich. Die Sichtbarkeit ist öffentlich und Forks bleiben möglich.

Die GitHub Actions laufen bei Pushes und auf manuelle Anforderung. Sie haben lesenden Zugriff, benötigen keine Projektgeheimnisse und verwenden feste Commit-Referenzen für Drittcode. Die CI installiert Chromium, FFmpeg und Python mit ReportLab.

## Veröffentlichung prüfen

1. Arbeitsbaum mit `node scripts/check-public-history.cjs --worktree` prüfen. Neue Dateien und Änderungen zusätzlich manuell sichten.
2. Mit einer GitHub-Noreply-Adresse committen. Vor dem Push `npm run check:public -- HEAD` für die gesamte Historie des **konkret zu veröffentlichenden Stands** ausführen.
3. Den vorgesehenen Remote und Zielbranch prüfen. Nur den geprüften Stand gezielt pushen und anschließend den CI-Lauf kontrollieren. Ältere lokale Entwicklungsbranches enthalten private Historie. Sie bleiben lokal.
4. Keine Zugangsdaten, privaten Geräteangaben, Medienlisten, Gerätescreenshots, Zertifikate, WGTs oder Logs einchecken. `.gitignore` allein entfernt keine Daten aus bereits verfolgten Dateien oder Commits.
5. Die MIT-Lizenz gilt für Code und Projektdokumentation. Die Marken- und Logoausnahmen stehen in [LICENSE](../LICENSE) und [branding/README.md](../branding/README.md).

Referenzen: [Repository-Einstellungen](https://docs.github.com/en/rest/repos/repos), [GitHub-Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).
