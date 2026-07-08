'use strict';

/**
 * Minimal in-process navigator shared by the screens. It only tracks which
 * screen is "current" and notifies listeners — the actual DOM swap is done
 * by whoever composes the screens (see README), but the navigation event
 * itself (e.g. "Volver a jugar" -> first question, "Salir" -> home) is
 * fired from here so it is real, testable behavior rather than a callback
 * left for a future integrator to wire.
 */

const SCREENS = Object.freeze({
  HOME: 'home',
  QUESTION: 'question',
  RESULTS: 'results',
});

let currentScreen = SCREENS.HOME;
const listeners = new Set();

function getCurrentScreen() {
  return currentScreen;
}

function navigateTo(screen) {
  currentScreen = screen;
  listeners.forEach((listener) => listener(currentScreen));
  return currentScreen;
}

function onNavigate(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

module.exports = { SCREENS, getCurrentScreen, navigateTo, onNavigate };
