import React from 'react';
import { render } from '@testing-library/react-native';
import NewBestScoreFeedback from './NewBestScoreFeedback';

describe('TRIOFSND-45: New Best Score mini-feedback UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<NewBestScoreFeedback />);
    expect(toJSON()).not.toBeNull();
  });

  it('displays the ¡Nueva mejor puntuación! message', () => {
    const { getByText } = render(<NewBestScoreFeedback />);
    expect(getByText('¡Nueva mejor puntuación!')).toBeTruthy();
  });

  it('renders nothing when visible is false', () => {
    const { toJSON } = render(<NewBestScoreFeedback visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('is visible by default', () => {
    const { getByText } = render(<NewBestScoreFeedback />);
    expect(getByText('¡Nueva mejor puntuación!')).toBeTruthy();
  });

  it('has a testID for accessibility and automation', () => {
    const { getByTestId } = render(<NewBestScoreFeedback />);
    expect(getByTestId('new-best-score-feedback')).toBeTruthy();
  });

  it('has an accessibility label', () => {
    const { getByLabelText } = render(<NewBestScoreFeedback />);
    expect(getByLabelText('Nueva mejor puntuación')).toBeTruthy();
  });

  it('uses a colorful (non-default) background color', () => {
    const { getByTestId } = render(<NewBestScoreFeedback />);
    const container = getByTestId('new-best-score-feedback');
    const style = Array.isArray(container.props.style)
      ? Object.assign({}, ...container.props.style)
      : container.props.style || {};
    expect(style.backgroundColor).toBeDefined();
    expect(style.backgroundColor).not.toBe('transparent');
  });

  it('has rounded corners for kid-friendly styling', () => {
    const { getByTestId } = render(<NewBestScoreFeedback />);
    const container = getByTestId('new-best-score-feedback');
    const style = Array.isArray(container.props.style)
      ? Object.assign({}, ...container.props.style)
      : container.props.style || {};
    expect(style.borderRadius).toBeDefined();
    expect(style.borderRadius).toBeGreaterThan(0);
  });

  it('has legible text with a contrasting color', () => {
    const { getByText } = render(<NewBestScoreFeedback />);
    const text = getByText('¡Nueva mejor puntuación!');
    const style = Array.isArray(text.props.style)
      ? Object.assign({}, ...text.props.style)
      : text.props.style || {};
    expect(style.color).toBeDefined();
    expect(style.color).not.toBe('transparent');
  });

  it('has a font size appropriate for kids (>= 16)', () => {
    const { getByText } = render(<NewBestScoreFeedback />);
    const text = getByText('¡Nueva mejor puntuación!');
    const style = Array.isArray(text.props.style)
      ? Object.assign({}, ...text.props.style)
      : text.props.style || {};
    expect(style.fontSize).toBeGreaterThanOrEqual(16);
  });

  it('matches the snapshot', () => {
    const { toJSON } = render(<NewBestScoreFeedback />);
    expect(toJSON()).toMatchSnapshot();
  });
});
