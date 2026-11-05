'use strict';

const path = require('node:path');
const root = path.resolve(__dirname, '..');

function runtimeFiles() {
  return [
    'LICENSE', 'config.xml', 'index.html', 'styles.css', 'motion.css', 'app.js', 'banner-texts.js', 'diagnostics.js', 'jellyfin-http.js', 'jellyfin-client.js', 'companion-tv.js', 'device-defaults.js', 'playback.js', 'avplay-adapter.js', 'clip-selection.js',
    'branding/config.js', 'branding/app-icon.png', 'branding/tv-icon.png',
    'assets/duo.svg', 'assets/hero-landscape.svg', 'assets/portrait.svg',
    'assets/poster-collection.svg', 'assets/poster-dunes.svg', 'assets/poster-horizon.svg',
    'assets/poster-night.svg', 'assets/poster-orbit.svg', 'assets/poster-tide.svg'
  ];
}

module.exports = { root, runtimeFiles };
