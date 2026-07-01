import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DinosaurImage } from './DinosaurImage';

describe('DinosaurImage Integration', () => {
  it('full flow: renders image, handles error, shows placeholder with legible text', async () => {
    const { container } = render(
      <DinosaurImage
        src="/images/trex.png"
        alt="T-Rex"
        caption="The mighty Tyrannosaurus Rex"
      />
    );

    // Initially the image is visible
    const img = screen.getByRole('img', { name: /t-rex/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/images/trex.png');

    // Caption is visible
    expect(screen.getByText('The mighty Tyrannosaurus Rex')).toBeInTheDocument();

    // No placeholder yet
    expect(screen.queryByTestId('dinosaur-placeholder')).not.toBeInTheDocument();

    // Simulate image load failure
    fireEvent.error(img);

    // Placeholder appears
    await waitFor(() => {
      expect(screen.getByTestId('dinosaur-placeholder')).toBeInTheDocument();
    });

    // Original image is hidden
    expect(img).toHaveStyle({ display: 'none' });

    // Placeholder image is rendered
    const placeholderImg = screen.getByTestId('placeholder-image');
    expect(placeholderImg).toBeInTheDocument();
    expect(placeholderImg).toHaveAttribute('alt', 'T-Rex');

    // Caption remains visible and legible
    const caption = screen.getByText('The mighty Tyrannosaurus Rex');
    expect(caption).toBeVisible();

    // Placeholder has a background for contrast
    const placeholder = screen.getByTestId('dinosaur-placeholder');
    const placeholderStyle = window.getComputedStyle(placeholder);
    expect(placeholderStyle.backgroundColor).not.toBe('transparent');
    expect(placeholderStyle.backgroundColor).not.toBe('');
  });

  it('handles rapid successive errors gracefully', async () => {
    render(
      <DinosaurImage
        src="/images/broken.png"
        alt="Broken Dino"
        caption="Caption text"
      />
    );

    const img = screen.getByRole('img', { name: /broken dino/i });

    // Fire multiple errors rapidly
    fireEvent.error(img);
    fireEvent.error(img);
    fireEvent.error(img);

    await waitFor(() => {
      expect(screen.getByTestId('dinosaur-placeholder')).toBeInTheDocument();
    });

    // Only one placeholder
    const placeholders = screen.getAllByTestId('dinosaur-placeholder');
    expect(placeholders).toHaveLength(1);

    // Text still legible
    expect(screen.getByText('Caption text')).toBeVisible();
  });

  it('recovers if a new valid src is provided after an error', () => {
    const { rerender } = render(
      <DinosaurImage
        src="/images/broken.png"
        alt="Dino"
        caption="Caption"
      />
    );

    const img = screen.getByRole('img', { name: /dino/i });
    fireEvent.error(img);

    expect(screen.getByTestId('dinosaur-placeholder')).toBeInTheDocument();

    // Rerender with a new source
    rerender(
      <DinosaurImage
        src="/images/valid.png"
        alt="Dino"
        caption="Caption"
      />
    );

    // Placeholder should be gone, new image visible
    expect(screen.queryByTestId('dinosaur-placeholder')).not.toBeInTheDocument();
    const newImg = screen.getByRole('img', { name: /dino/i });
    expect(newImg).toHaveAttribute('src', '/images/valid.png');
    expect(newImg).not.toHaveStyle({ display: 'none' });
  });
});
