import React from 'react';
import { render } from '@testing-library/react-native';
import { NewBestScoreFeedback } from './NewBestScoreFeedback';

describe('TRIOFSND-45: NewBestScoreFeedback mini-feedback UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<NewBestScoreFeedback visible={true} />);
    expect(toJSON()).not.toBeNull();
  });

  it('displays the ¡Nueva mejor puntuación! message when visible', () => {
    const { getByText } = render(<NewBestScoreFeedback visible={true} />);
    expect(getByText('¡Nueva mejor puntuación!')).toBeTruthy();
  });

  it('does not display the message when not visible', () => {
    const { queryByText } = render(<NewBestScoreFeedback visible={false} />);
    expect(queryByText('¡Nueva mejor puntuación!')).toBeNull();
  });

  it('renders an accessible container for the feedback', () => {
    const { getByTestId } = render(<NewBestScoreFeedback visible={true} />);
    const container = getByTestId('new-best-score-feedback');
    expect(container).toBeTruthy();
  });

  it('uses a non-default background color for kid-friendly styling', () => {
    const { getByTestId } = render(<NewBestScoreFeedback visible={true} />);
    const container = getByTestId('new-best-score-feedback');
    const style = Array.isArray(container.props.style)
      ? Object.assign({}, ...container.props.style)
      : container.props.style || {};
    expect(style.backgroundColor).toBeDefined();
    expect(style.backgroundColor).not.toBe('transparent');
  });

  it('has rounded corners for kid-friendly styling', () => {
    const { getByTestId } = render(<NewBestScoreFeedback visible={true} />);
    const container = getByTestId('new-best-score-feedback');
    const style = Array.isArray(container.props.style)
      ? Object.assign({}, ...container.props.style)
      : container.props.style || {};
    expect(style.borderRadius).toBeDefined();
    expect(style.borderRadius).toBeGreaterThan(0);
  });

  it('renders legible text with a contrasting color', () => {
    const { getByText } = render(<NewBestScoreFeedback visible={true} />);
    const text = getByText('¡Nueva mejor puntuación!');
    const style = Array.isArray(text.props.style)
      ? Object.assign({}, ...text.props.style)
      : text.props.style || {};
    expect(style.color).toBeDefined();
    expect(style.color).not.toBe('transparent');
  });

  it('renders text with a font size appropriate for kids (>= 16)', () => {
    const { getByText } = render(<NewBestScoreFeedback visible={true} />);
    const text = getByText('¡Nueva mejor puntuación!');
    const style = Array.isArray(text.props.style)
      ? Object.assign({}, ...text.props.style)
      : text.props.style || {};
    expect(style.fontSize).toBeGreaterThanOrEqual(16);
  });

  it('updates visibility when the visible prop changes', () => {
    const { getByText, rerender, queryByText } = render(
      <NewBestScoreFeedback visible={false} />
    );
    expect(queryByText('¡Nueva mejor puntuación!')).toBeNull();

    rerender(<NewBestScoreFeedback visible={true} />);
    expect(getByText('¡Nueva mejor puntuación!')).toBeTruthy();
  });
});
