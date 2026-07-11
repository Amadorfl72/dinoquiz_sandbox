'use strict';

/**
 * Re-export of the Question screen from public/scripts for testing.
 * The canonical implementation lives in public/scripts/questionScreen.js
 * to support the browser-loaded PWA (no bundler).
 */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = require('../../public/scripts/questionScreen');
}
