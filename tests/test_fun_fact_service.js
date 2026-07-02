import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuestionFeedback from '../src/components/QuestionFeedback';
import { logFunFactViewed } from '../src/analytics/logger';
import { incrementMetric } from '../src/analytics/metrics';

jest.mock('../src/analytics/logger', () => ({
  logFunFactViewed: jest.fn()
}));

jest.mock('../src/analytics/metrics', () => ({
  incrementMetric: jest.fn()
}));

describe('QuestionFeedback component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders fun fact content', () => {
    const { getByText } = render(
      <QuestionFeedback
        questionId="q123"
        dinoId="d456"
        appVersion="1.0.0"
        funFact="Los dinosaurios eran enormes."
      />
    );

    expect(getByText('¡Dato curioso!')).toBeInTheDocument();
    expect(getByText('Los dinosaurios eran enormes.')).toBeInTheDocument();
  });

  test('logs fun_fact_viewed event on mount with correct props', () => {
    render(
      <QuestionFeedback
        questionId="q123"
        dinoId="d456"
        appVersion="1.0.0"
        funFact="Some fun fact"
      />
    );

    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    expect(logFunFactViewed).toHaveBeenCalledWith('q123', 'd456', '1.0.0');
  });

  test('logs fun_fact_viewed event with different props', () => {
    render(
      <QuestionFeedback
        questionId="q789"
        dinoId="d999"
        appVersion="2.1.3"
        funFact="T-Rex had tiny arms."
      />
    );

    expect(logFunFactViewed).toHaveBeenCalledWith('q789', 'd999', '2.1.3');
  });

  test('re-logs when questionId changes', () => {
    const { rerender } = render(
      <QuestionFeedback
        questionId="q1"
        dinoId="d1"
        appVersion="1.0.0"
        funFact="Fact 1"
      />
    );

    rerender(
      <QuestionFeedback
        questionId="q2"
        dinoId="d1"
        appVersion="1.0.0"
        funFact="Fact 2"
      />
    );

    expect(logFunFactViewed).toHaveBeenCalledTimes(2);
    expect(logFunFactViewed).toHaveBeenNthCalledWith(1, 'q1', 'd1', '1.0.0');
    expect(logFunFactViewed).toHaveBeenNthCalledWith(2, 'q2', 'd1', '1.0.0');
  });

  test('re-logs when dinoId changes', () => {
    const { rerender } = render(
      <QuestionFeedback
        questionId="q1"
        dinoId="d1"
        appVersion="1.0.0"
        funFact="Fact 1"
      />
    );

    rerender(
      <QuestionFeedback
        questionId="q1"
        dinoId="d2"
        appVersion="1.0.0"
        funFact="Fact 2"
      />
    );

    expect(logFunFactViewed).toHaveBeenCalledTimes(2);
    expect(logFunFactViewed).toHaveBeenNthCalledWith(2, 'q1', 'd2', '1.0.0');
  });

  test('re-logs when appVersion changes', () => {
    const { rerender } = render(
      <QuestionFeedback
        questionId="q1"
        dinoId="d1"
        appVersion="1.0.0"
        funFact="Fact 1"
      />
    );

    rerender(
      <QuestionFeedback
        questionId="q1"
        dinoId="d1"
        appVersion="2.0.0"
        funFact="Fact 2"
      />
    );

    expect(logFunFactViewed).toHaveBeenCalledTimes(2);
    expect(logFunFactViewed).toHaveBeenNthCalledWith(2, 'q1', 'd1', '2.0.0');
  });

  test('does not re-log when only funFact changes', () => {
    const { rerender } = render(
      <QuestionFeedback
        questionId="q1"
        dinoId="d1"
        appVersion="1.0.0"
        funFact="Fact 1"
      />
    );

    rerender(
      <QuestionFeedback
        questionId="q1"
        dinoId="d1"
        appVersion="1.0.0"
        funFact="Fact 2"
      />
    );

    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
  });
});

describe('fun_fact_viewed metric and logging integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('logFunFactViewed calls incrementMetric with fun_fact_viewed', () => {
    const actualLogger = jest.requireActual('../src/analytics/logger');
    jest.unmock('../src/analytics/logger');

    actualLogger.logFunFactViewed('q789', 'd999', '2.1.3');

    expect(incrementMetric).toHaveBeenCalledWith('fun_fact_viewed');
  });
});
