import React from 'react';
import { render } from '@testing-library/react';
import HomeScreen from '../src/components/HomeScreen';

describe('TRIOFSND-50: Home Screen UI and Accessibility', () => {
  let getByText, getByTestId;

  beforeEach(() => {
    const renderResult = render(<HomeScreen />);
    getByText = renderResult.getByText;
    getByTestId = renderResult.getByTestId;
  });

  it('renders the DinoQuiz title', () => {
    const title = getByText('DinoQuiz');
    expect(title).toBeTruthy();
    expect(title.tagName).toBe('H1');
  });

  it('renders the dinosaur mascot illustration', () => {
    const mascot = getByTestId('dino-mascot');
    expect(mascot).toBeTruthy();
    expect(mascot.tagName).toBe('IMG');
    expect(mascot.getAttribute('alt')).toBe('Dinosaurio mascota de DinoQuiz');
  });

  it('renders the ¡Jugar! button', () => {
    expect(getByText('¡Jugar!')).toBeTruthy();
  });

  it('has a button with height >= 64dp', () => {
    const button = getByTestId('play-button');
    expect(button.className).toContain('play-button');
    const style = window.getComputedStyle(button);
    const minHeight = parseInt(style.getPropertyValue('min-height') || '0', 10);
    expect(minHeight).toBeGreaterThanOrEqual(64);
  });

  it('has a button touch area >= 48x48dp', () => {
    const button = getByTestId('play-button');
    const style = window.getComputedStyle(button);
    const minWidth = parseInt(style.getPropertyValue('min-width') || '0', 10);
    const minHeight = parseInt(style.getPropertyValue('min-height') || '0', 10);
    expect(minWidth).toBeGreaterThanOrEqual(48);
    expect(minHeight).toBeGreaterThanOrEqual(48);
  });

  it('has text >= 24sp', () => {
    const textElement = getByText('¡Jugar!');
    const style = window.getComputedStyle(textElement);
    const fontSize = parseInt(style.fontSize || '0', 10);
    expect(fontSize).toBeGreaterThanOrEqual(24);
  });

  it('is keyboard navigable', () => {
    const button = getByTestId('play-button');
    expect(button.tagName).toBe('BUTTON');
    expect(button.tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('has ARIA labels and correct role', () => {
    const button = getByTestId('play-button');
    expect(button.getAttribute('aria-label')).toBe('Botón para comenzar a jugar DinoQuiz');
    expect(button.getAttribute('accessibilityRole')).toBe('button');
  });
});
