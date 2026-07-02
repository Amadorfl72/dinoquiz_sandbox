import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import NextButton from './NextButton';

test('NextButton debounces clicks', () => {
  const onClick = jest.fn();
  const { getByText } = render(<NextButton onClick={onClick} />);

  const button = getByText('Next');
  fireEvent.click(button);
  fireEvent.click(button);

  expect(onClick).toHaveBeenCalledTimes(1);
});