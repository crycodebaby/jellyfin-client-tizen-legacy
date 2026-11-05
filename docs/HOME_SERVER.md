# Heimserver und privater Fernzugriff

Stand 5. November 2026. Es ist noch kein neuer Heimserver vorhanden. Diese Vorbereitung wurde nicht auf einem Linux-Zielgerät gestartet.

## Vorgesehener Betrieb

Linux mit Docker Compose und Jellyfin. System, Konfiguration und Cache liegen auf SSD. Filme liegen auf fest eingebundenen Datenträgern. Die Compose-Datei unter deploy/home-server verwendet getrennte Verzeichnisse und nur lesenden Medienzugriff. Fehlende Verzeichnisse werden nicht automatisch angelegt. Bei separaten Datenträgern muss der Betreiber vor dem Start zusätzlich den tatsächlichen Mount prüfen. Ein vorhandener leerer Mountpunkt beweist keinen eingebundenen Datenträger.

1. Linux und Docker installieren. Datenträgerzustand und Sicherung prüfen.
2. Filme unter stabilen Mountpunkten einbinden. Für weitere Platten separate read-only Bind-Mounts ergänzen.
3. Konfigurations- und Cacheverzeichnisse anlegen und dem gewählten Dienstbenutzer zugänglich machen.
4. deploy/home-server/.env.example nach .env kopieren. Passenden Benutzer, Pfade und eine ausdrücklich geprüfte Image-Version oder einen Digest eintragen.
5. Mit docker compose config prüfen, danach docker compose up -d starten.
6. Bei Neustart prüfen, ob Datenträger vor Docker verfügbar sind. Dafür einen systemd-Dienst mit RequiresMountsFor auf die tatsächlichen Medienpfade einsetzen.
7. Quick Sync erst ergänzen, wenn /dev/dri und Rendergruppen auf dem Zielgerät geprüft sind. Die Vorlage enthält noch keine GPU-Freigabe.

Standardmäßig wird Jellyfin nur über Loopback veröffentlicht. Für den TV im Heimnetz die feste LAN-Adresse des Heimservers als JELLYFIN_BIND_IP wählen und die Erreichbarkeit aus dem Internet gesondert ausschließen. Docker-Portfreigaben und Routerkonfiguration gemeinsam prüfen.

## Tailscale zuerst für Jellyfin

Tailscale auf dem neuen Server und den berechtigten Mobilgeräten anmelden. Zugriff auf die benötigten Dienste durch Tailnet-Regeln begrenzen. Auf dem Server kann tailscale serve --bg 8096 einen privaten HTTPS-Zugang bereitstellen. Servername und Zertifikat werden dabei im Tailnet eingerichtet. Dieser Schritt erfordert die Anmeldung des Besitzers und wurde hier noch nicht ausgeführt.

Mit Mobilfunk testen, während WLAN ausgeschaltet ist. Anmeldung, Bild, Ton, Spulen und Wiederaufnahme prüfen. Tailscale Serve ist für private Tailnet-Zugriffe gedacht. Die Veröffentlichung im öffentlichen Internet wäre ein gesonderter Umfang.

Connect bleibt vorerst ein LAN-Dienst mit Host- und Herkunftsprüfung. Die neue TV-Konfiguration erlaubt HTTPS-Adressen, beweist aber noch keinen funktionierenden Proxybetrieb des Relay. Fremde Hostnamen, Bilder, Quick-Connect-Freigaben und QR-Ziele müssen gemeinsam angepasst und geprüft werden.

## Sicherung und Umzug

Jellyfin stoppen und eine vollständige Sicherung der Konfiguration und Datenbank erstellen. Cache ist ersetzbar. Medien und Clips gesondert sichern. Die Sicherung enthält Geheimnisse und gehört nicht ins Repository.

Den alten Server bis zum bestandenen Umzugstest behalten. Eine Übernahme zwischen Windows und Linux mit geänderten Medienpfaden ist kein garantierter Datenbankumzug. Vorher offizielle Backup-Anleitung und Pfadabbildung prüfen. Bei Neuinstallation können Benutzer- und Film-IDs wechseln. Lokale Sammlungsverknüpfungen und Clipzuordnungen dann ausdrücklich migrieren oder zurücksetzen.

Für eine neue Serveradresse verwendet die App getrennte Profile nach Server-URL. Anmeldungen an der alten Adresse werden nicht automatisch an die neue übertragen. In Einstellungen die gespeicherte Adresse ändern, neu prüfen und anmelden. Bestehende Server-URLs im Profilverzeichnis bleiben getrennt. Ein Benutzer kann derzeit nicht per eigener Serverprofil-Auswahl zwischen mehreren Servern wechseln.

## Offene Abnahme

- Neustart mit eingebundenen Datenträgern und automatischem Dienststart.
- Wiederherstellung einer Sicherung auf einem Testsystem.
- Zwei echte Konten mit getrenntem Verlauf.
- Private Wiedergabe über Mobilfunk.
- Tizen-Zertifikatsverträglichkeit, Durchsatz und Upload des Heimanschlusses.
- Speichergrenzen für Clips und geprüfte Relay-Freigaben.

Grundlagen
- https://jellyfin.org/docs/general/installation/container/
- https://tailscale.com/docs/solutions/host-private-server-docker
