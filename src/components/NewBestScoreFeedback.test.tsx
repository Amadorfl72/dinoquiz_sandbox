import React from 'react';
import { render } from '@testing-library/react-native';
import NewBestScoreFeedback from './NewBestScoreFeedback';

describe('NewBestScoreFeedback', () => {
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
    const { getByLabelText } = render(<NewBestScoreFeedback visible={true} />);
    expect(getByLabelText('¡Nueva mejor puntuación!')).toBeTruthy();
  });

  it('uses a non-default background color for kid-friendly styling', () => {
    const { getByTestId } = render(
      <NewBestScoreFeedback visible={true} testID="feedback-container" />
    );
    const container = getByTestId('feedback-container');
    const style = Array.isArray(container.props.style)
      ? Object.assign({}, ...container.props.style)
      : container.props.style || {};
    expect(style.backgroundColor).toBe('#FFD700');
  });

  it('has rounded corners for kid-friendly styling', () => {
    const { getByTestId } = render(
      <NewBestScoreFeedback visible={true} testID="feedback-container" />
    );
    const container = getByTestId('feedback-container');
    const style = Array.isArray(container.props.style)
      ? Object.assign({}, ...container.props.style)
      : container.props.style || {};
    expect(style.borderRadius).toBe(16);
  });

  it('renders legible text with a contrasting color', () => {
    const { getByText } = render(<NewBestScoreFeedback visible={true} />);
    const text = getByText('¡Nueva mejor puntuación!');
    const style = Array.isArray(text.props.style)
      ? Object.assign({}, ...text.props.style)
      : text.props.style || {};
    expect(style.color).toBe('#333');
    expect(style.fontSize).toBe(18);
  });

  it('updates visibility when the visible prop changes', () => {
    const { queryByText, rerender } = render(
      <NewBestScoreFeedback visible={false} />
    );
    expect(queryByText('¡Nueva mejor puntuación!')).toBeNull();
    
    rerender(<NewBestScoreFeedback visible={true} />);
    expect(queryByText('¡Nueva mejor puntuación!')).toBeTruthy();
  });
});