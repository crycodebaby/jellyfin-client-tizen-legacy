'use strict';

const path = require('node:path');
const root = path.resolve(__dirname, '..');

function runtimeFiles() {
  return [
    'LICENSE', 'config.xml', 'index.html', 'styles.css', 'motion.css', 'app.js', 'diagnostics.js',
    'branding/config.js', 'branding/app-icon.png',
    'assets/duo.svg', 'assets/hero-landscape.svg', 'assets/portrait.svg',
    'assets/poster-collection.svg', 'assets/poster-dunes.svg', 'assets/poster-horizon.svg',
    'assets/poster-night.svg', 'assets/poster-orbit.svg', 'assets/poster-tide.svg'
  ];
}

module.exports = { root, runtimeFiles };
