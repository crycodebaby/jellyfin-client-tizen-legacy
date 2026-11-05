# Konfiguration der Connect-Adresse

Die TV-App nutzt für QR, Handyverbindung und Clips dieselbe Funktion companionAddress. Ohne Vorgabe verwendet sie denselben Host wie Jellyfin und Port 8787. Das Schema folgt dem Jellyfin-Schema. HTTPS fällt nicht automatisch auf HTTP zurück.

In einer ausschließlich lokalen device-defaults.js kann die Zuordnung je Jellyfin-URL gesetzt werden. Die URL-Schreibweise einschließlich Basis-Pfad muss zur normalisierten Serveradresse passen.

```javascript
window.SMAIRYS_DEVICE_DEFAULTS = {
  companionUrls: {
    'https://media.example.invalid': 'https://connect.example.invalid'
  }
};
```

Die eigene Datei bleibt privat und wird beim Paketbau eingespielt. Die ausgelieferte Quelldatei enthält weiterhin keine private Vorgabe. Änderungen an diesem Mapping erfordern ein neues TV-Paket.

Die Client-Unterstützung für getrennte Adressen ist vorbereitet. Der Relay-Dienst verlangt weiterhin passende Hostnamen und Serverziele. Ein separater Connect-Host oder Reverse Proxy muss daher zusätzlich serverseitig eingerichtet und getestet werden. Der vorhandene Relay darf nicht unverändert öffentlich freigegeben werden.
