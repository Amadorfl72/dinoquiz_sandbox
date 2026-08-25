'use strict';

/**
 * Logging service re-export for Node/Jest.
 *
 * This module re-exports the canonical LogService from ./LogService.js
 * following the same pattern as src/services/network.js. The browser-based
 * app shell loads the service directly from public/scripts/logging.js as a
 * plain <script>, while Node/Jest tests import from here.
 */

module.exports = require('./LogService');
