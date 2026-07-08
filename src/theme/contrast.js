'use strict';

/**
 * WCAG 2.x contrast ratio helpers, used to guard the feedback color tokens
 * (see public/styles/main.css, "Question screen — feedback states") against
 * regressions below the AA threshold required by PRD AC-13.
 */

const WCAG_AA_NORMAL_TEXT = 4.5;
const WCAG_AA_LARGE_TEXT = 3;

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function toLinearChannel(channel) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance({ r, g, b }) {
  return 0.2126 * toLinearChannel(r) + 0.7152 * toLinearChannel(g) + 0.0722 * toLinearChannel(b);
}

/** WCAG contrast ratio between two hex colors, in the range [1, 21]. */
function contrastRatio(hexA, hexB) {
  const luminanceA = relativeLuminance(hexToRgb(hexA));
  const luminanceB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

function meetsWcagAA(ratio, { largeText = false } = {}) {
  return ratio >= (largeText ? WCAG_AA_LARGE_TEXT : WCAG_AA_NORMAL_TEXT);
}

module.exports = {
  WCAG_AA_NORMAL_TEXT,
  WCAG_AA_LARGE_TEXT,
  contrastRatio,
  meetsWcagAA,
};
