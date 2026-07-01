import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ResultsScreen } from '../src/screens/ResultsScreen';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// ─── Helpers ────────────────────────────────────────────────────────────────

const MESSAGES = {
  LOW: expect.stringMatching(/.+/),       // 0-3
  MEDIUM: expect.stringMatching(/.+/),     // 4-6
  HIGH: expect.stringMatching(/.+/),       // 7-8
  TOP: expect.stringMatching(/.+/),        // 9-10
};

function getButtonHeight(tree: ReturnType<typeof render>): number | null {
  const button = tree.UNSAFE_getByType(TouchableOpacity);
  if (!button) return null;
  const style = StyleSheet.flatten(button.props.style);
  return style.minHeight ?? style.height ?? null;
}

// ─── Score display ───────────────────────────────────────────────────────────

describe('ResultsScreen – score display', () => {
  it('renders "Has acertado X/10" with the correct score', () => {
    const { getByText } = render(<ResultsScreen score={7} onRetry={jest.fn()} />);
    expect(getByText('Has acertado 7/10')).toBeTruthy();
  });

  it('renders 0 correctly', () => {
    const { getByText } = render(<ResultsScreen score={0} onRetry={jest.fn()} />);
    expect(getByText('Has acertado 0/10')).toBeTruthy();
  });

  it('renders 10 correctly', () => {
    const { getByText } = render(<ResultsScreen score={10} onRetry={jest.fn()} />);
    expect(getByText('Has acertado 10/10')).toBeTruthy();
  });

  it('does not render a negative or >10 score', () => {
    const { queryByText } = render(<ResultsScreen score={-1} onRetry={jest.fn()} />);
    expect(queryByText(/Has acertado/)).toBeNull();
  });
});

// ─── Motivating messages by range ────────────────────────────────────────────

describe('ResultsScreen – motivating messages', () => {
  const cases: Array<[number, string]> = [
    [0, 'LOW'],
    [1, 'LOW'],
    [2, 'LOW'],
    [3, 'LOW'],
    [4, 'MEDIUM'],
    [5, 'MEDIUM'],
    [6, 'MEDIUM'],
    [7, 'HIGH'],
    [8, 'HIGH'],
    [9, 'TOP'],
    [10, 'TOP'],
  ];

  it.each(cases)('shows a non-empty message for score %i (range %s)', (score) => {
    const { getByTestId } = render(<ResultsScreen score={score} onRetry={jest.fn()} />);
    const msg = getByTestId('motivating-message');
    expect(msg.props.children).toBeTruthy();
    expect(typeof msg.props.children).toBe('string');
    expect((msg.props.children as string).length).toBeGreaterThan(0);
  });

  it('shows the same message for all scores in the 0-3 range', () => {
    const msgs: string[] = [];
    for (let s = 0; s <= 3; s++) {
      const { getByTestId } = render(<ResultsScreen score={s} onRetry={jest.fn()} />);
      msgs.push(getByTestId('motivating-message').props.children as string);
    }
    expect(new Set(msgs).size).toBe(1);
  });

  it('shows the same message for all scores in the 4-6 range', () => {
    const msgs: string[] = [];
    for (let s = 4; s <= 6; s++) {
      const { getByTestId } = render(<ResultsScreen score={s} onRetry={jest.fn()} />);
      msgs.push(getByTestId('motivating-message').props.children as string);
    }
    expect(new Set(msgs).size).toBe(1);
  });

  it('shows the same message for all scores in the 7-8 range', () => {
    const msgs: string[] = [];
    for (let s = 7; s <= 8; s++) {
      const { getByTestId } = render(<ResultsScreen score={s} onRetry={jest.fn()} />);
      msgs.push(getByTestId('motivating-message').props.children as string);
    }
    expect(new Set(msgs).size).toBe(1);
  });

  it('shows the same message for all scores in the 9-10 range', () => {
    const msgs: string[] = [];
    for (let s = 9; s <= 10; s++) {
      const { getByTestId } = render(<ResultsScreen score={s} onRetry={jest.fn()} />);
      msgs.push(getByTestId('motivating-message').props.children as string);
    }
    expect(new Set(msgs).size).toBe(1);
  });

  it('shows different messages across the four ranges', () => {
    const { getByTestId: g0 } = render(<ResultsScreen score={2} onRetry={jest.fn()} />);
    const { getByTestId: g4 } = render(<ResultsScreen score={5} onRetry={jest.fn()} />);
    const { getByTestId: g7 } = render(<ResultsScreen score={8} onRetry={jest.fn()} />);
    const { getByTestId: g9 } = render(<ResultsScreen score={10} onRetry={jest.fn()} />);

    const m0 = g0('motivating-message').props.children as string;
    const m4 = g4('motivating-message').props.children as string;
    const m7 = g7('motivating-message').props.children as string;
    const m9 = g9('motivating-message').props.children as string;

    expect(new Set([m0, m4, m7, m9]).size).toBe(4);
  });

  it('boundary: score 3 uses the low-range message, not the medium-range', () => {
    const { getByTestId: g3 } = render(<ResultsScreen score={3} onRetry={jest.fn()} />);
    const { getByTestId: g4 } = render(<ResultsScreen score={4} onRetry={jest.fn()} />);
    const m3 = g3('motivating-message').props.children as string;
    const m4 = g4('motivating-message').props.children as string;
    expect(m3).not.toBe(m4);
  });

  it('boundary: score 6 uses the medium-range message, not the high-range', () => {
    const { getByTestId: g6 } = render(<ResultsScreen score={6} onRetry={jest.fn()} />);
    const { getByTestId: g7 } = render(<ResultsScreen score={7} onRetry={jest.fn()} />);
    const m6 = g6('motivating-message').props.children as string;
    const m7 = g7('motivating-message').props.children as string;
    expect(m6).not.toBe(m7);
  });

  it('boundary: score 8 uses the high-range message, not the top-range', () => {
    const { getByTestId: g8 } = render(<ResultsScreen score={8} onRetry={jest.fn()} />);
    const { getByTestId: g9 } = render(<ResultsScreen score={9} onRetry={jest.fn()} />);
    const m8 = g8('motivating-message').props.children as string;
    const m9 = g9('motivating-message').props.children as string;
    expect(m8).not.toBe(m9);
  });
});

// ─── "Volver a jugar" button ──────────────────────────────────────────────────

describe('ResultsScreen – "Volver a jugar" button', () => {
  it('renders a button with the text "Volver a jugar"', () => {
    const { getByText } = render(<ResultsScreen score={5} onRetry={jest.fn()} />);
    expect(getByText('Volver a jugar')).toBeTruthy();
  });

  it('has a minimum height of at least 48dp', () => {
    const tree = render(<ResultsScreen score={5} onRetry={jest.fn()} />);
    const height = getButtonHeight(tree);
    expect(height).not.toBeNull();
    expect(height).toBeGreaterThanOrEqual(48);
  });

  it('calls onRetry when pressed', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<ResultsScreen score={5} onRetry={onRetry} />);
    fireEvent.press(getByText('Volver a jugar'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('is enabled and pressable', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<ResultsScreen score={5} onRetry={onRetry} />);
    const btn = getByText('Volver a jugar');
    expect(btn.props.disabled).not.toBe(true);
  });

  it('renders the button regardless of score', () => {
    for (let s = 0; s <= 10; s++) {
      const { getByText } = render(<ResultsScreen score={s} onRetry={jest.fn()} />);
      expect(getByText('Volver a jugar')).toBeTruthy();
    }
  });
});

// ─── Snapshot ────────────────────────────────────────────────────────────────

describe('ResultsScreen – snapshot', () => {
  it('matches snapshot for score 0', () => {
    const { toJSON } = render(<ResultsScreen score={0} onRetry={jest.fn()} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot for score 10', () => {
    const { toJSON } = render(<ResultsScreen score={10} onRetry={jest.fn()} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
