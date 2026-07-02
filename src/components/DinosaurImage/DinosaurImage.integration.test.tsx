import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DinosaurImage from './DinosaurImage';

describe('DinosaurImage – Integration', () => {
  it('shows placeholder and keeps caption visible end-to-end', async () => {
    render(
      <DinosaurImage
        src="https://broken.example.com/dino.jpg"
        alt="Triceratops"
        caption="The mighty Triceratops"
      />
    );

    const image = screen.getByRole('img', { name: /triceratops/i });
    expect(image).toHaveAttribute('src', 'https://broken.example.com/dino.jpg');

    fireEvent.error(image);

    await waitFor(() => {
      expect(screen.getByTestId('dinosaur-placeholder')).toBeInTheDocument();
    });

    expect(screen.getByText(/the mighty triceratops/i)).toBeVisible();
    expect(screen.getByTestId('caption-overlay')).toBeInTheDocument();
  });

  it('recovers and shows original image if remounted with a valid src', () => {
    const { rerender } = render(
      <DinosaurImage key="broken" src="https://broken.example.com/dino.jpg" alt="Dino" />
    );

    fireEvent.error(screen.getByRole('img', { name: /dino/i }));
    expect(screen.getByTestId('dinosaur-placeholder')).toBeInTheDocument();

    // Use a different key to force remount, resetting internal error state
    rerender(<DinosaurImage key="valid" src="https://valid.example.com/dino.jpg" alt="Dino" />);

    const image = screen.getByRole('img', { name: /dino/i }) as HTMLImageElement;
    expect(image.src).toBe('https://valid.example.com/dino.jpg');
    expect(screen.queryByTestId('dinosaur-placeholder')).not.toBeInTheDocument();
  });

  it('handles rapid successive error events gracefully', () => {
    render(<DinosaurImage src="https://broken.example.com/dino.jpg" alt="Dino" />);
    const image = screen.getByRole('img', { name: /dino/i });

    fireEvent.error(image);
    fireEvent.error(image);
    fireEvent.error(image);

    const placeholders = screen.queryAllByTestId('dinosaur-placeholder');
    expect(placeholders).toHaveLength(1);
  });
});
