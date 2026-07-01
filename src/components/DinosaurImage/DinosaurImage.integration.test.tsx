import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DinosaurImage } from './DinosaurImage';

describe('DinosaurImage Integration - Image Fallback Placeholder (TRIOFSND-27)', () => {
  it('full flow: image loads, fails, shows placeholder, and text remains legible', async () => {
    const { container } = render(
      <div data-testid='dino-section'>
        <h2 data-testid='section-title'>Meet Our Dinosaur</h2>
        <DinosaurImage
          src='https://broken-url.example.com/dino.png'
          alt='T-Rex illustration'
          width={400}
          height={300}
        />
        <p data-testid='description'>
          The Tyrannosaurus Rex was one of the largest meat-eating dinosaurs.
        </p>
      </div>
    );

    // Initially, the image should be present and placeholder should not be visible
    const image = screen.getByAltText('T-Rex illustration');
    expect(image).toBeInTheDocument();
    expect(screen.queryByTestId('dinosaur-placeholder')).not.toBeInTheDocument();

    // Text should be legible initially
    const title = screen.getByTestId('section-title');
    const description = screen.getByTestId('description');
    expect(title).toBeVisible();
    expect(description).toBeVisible();

    // Simulate image load failure
    fireEvent.error(image);

    // Placeholder should now be visible
    await waitFor(() => {
      const placeholder = screen.getByTestId('dinosaur-placeholder');
      expect(placeholder).toBeInTheDocument();
      expect(placeholder).toBeVisible();
    });

    // The broken image should be hidden
    expect(image).toHaveStyle({ display: 'none' });

    // Text should still be legible after placeholder is shown
    expect(title).toBeVisible();
    expect(description).toBeVisible();

    // The section container should still be intact
    const section = screen.getByTestId('dino-section');
    expect(section).toContainElement(title);
    expect(section).toContainElement(description);
    expect(section).toContainElement(screen.getByTestId('dinosaur-placeholder'));
  });

  it('handles network-level image failure gracefully', async () => {
    render(<DinosaurImage src='https://nonexistent.example.com/dino.jpg' alt='Stegosaurus' />);
    const image = screen.getByAltText('Stegosaurus');

    // Simulate a network error (error event)
    fireEvent.error(image);

    await waitFor(() => {
      expect(screen.getByTestId('dinosaur-placeholder')).toBeInTheDocument();
    });

    // Ensure no unhandled error is thrown in the DOM
    const placeholder = screen.getByTestId('dinosaur-placeholder');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toBeVisible();
  });

  it('handles corrupted image data failure gracefully', async () => {
    render(<DinosaurImage src='data:invalid-base64-data' alt='Triceratops' />);
    const image = screen.getByAltText('Triceratops');

    fireEvent.error(image);

    await waitFor(() => {
      expect(screen.getByTestId('dinosaur-placeholder')).toBeInTheDocument();
    });
  });

  it('preserves layout integrity when placeholder replaces broken image', async () => {
    const { container } = render(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <DinosaurImage src='https://broken.example.com/dino.png' alt='Brontosaurus' width={500} height={350} />
        <div data-testid='content-below'>Important content below the image</div>
      </div>
    );

    const image = screen.getByAltText('Brontosaurus');
    fireEvent.error(image);

    await waitFor(() => {
      expect(screen.getByTestId('dinosaur-placeholder')).toBeInTheDocument();
    });

    // Content below should still be visible and not pushed off-screen
    const contentBelow = screen.getByTestId('content-below');
    expect(contentBelow).toBeVisible();
  });
});
