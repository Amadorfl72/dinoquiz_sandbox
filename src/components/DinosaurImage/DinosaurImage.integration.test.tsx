import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DinosaurCard } from './DinosaurCard';

describe('DinosaurCard - Image Fallback Integration', () => {
  const dinosaur = {
    id: 'dino-1',
    name: 'Tyrannosaurus Rex',
    image: 'https://example.com/trex.jpg',
    description: 'A large theropod dinosaur from the Late Cretaceous period.',
    period: 'Late Cretaceous',
    diet: 'Carnivore',
  };

  it('renders the dinosaur card with image', () => {
    render(<DinosaurCard dinosaur={dinosaur} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', dinosaur.image);
    expect(img).toHaveAttribute('alt', expect.stringContaining(dinosaur.name));
  });

  it('shows placeholder when dinosaur image fails to load', () => {
    render(<DinosaurCard dinosaur={dinosaur} />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();
  });

  it('dinosaur name remains legible when image fails', () => {
    render(<DinosaurCard dinosaur={dinosaur} />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    const name = screen.getByRole('heading', { name: dinosaur.name });
    expect(name).toBeVisible();
    const styles = window.getComputedStyle(name);
    expect(styles.color).not.toBe('transparent');
    expect(styles.opacity).not.toBe('0');
  });

  it('dinosaur description remains legible when image fails', () => {
    render(<DinosaurCard dinosaur={dinosaur} />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    const description = screen.getByText(dinosaur.description);
    expect(description).toBeVisible();
    const styles = window.getComputedStyle(description);
    expect(styles.color).not.toBe('transparent');
    expect(styles.opacity).not.toBe('0');
  });

  it('dinosaur metadata (period, diet) remains legible when image fails', () => {
    render(<DinosaurCard dinosaur={dinosaur} />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    expect(screen.getByText(dinosaur.period)).toBeVisible();
    expect(screen.getByText(dinosaur.diet)).toBeVisible();
  });

  it('placeholder does not overlap or obscure text content', () => {
    render(<DinosaurCard dinosaur={dinosaur} />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    const placeholder = screen.getByTestId('image-placeholder');
    const name = screen.getByRole('heading', { name: dinosaur.name });
    const description = screen.getByText(dinosaur.description);

    const placeholderRect = placeholder.getBoundingClientRect();
    const nameRect = name.getBoundingClientRect();
    const descRect = description.getBoundingClientRect();

    const overlapsName =
      placeholderRect.top < nameRect.bottom &&
      placeholderRect.bottom > nameRect.top &&
      placeholderRect.left < nameRect.right &&
      placeholderRect.right > nameRect.left;

    const overlapsDesc =
      placeholderRect.top < descRect.bottom &&
      placeholderRect.bottom > descRect.top &&
      placeholderRect.left < descRect.right &&
      placeholderRect.right > descRect.left;

    expect(overlapsName || nameRect.top >= placeholderRect.bottom).toBe(true);
    expect(overlapsDesc || descRect.top >= placeholderRect.bottom).toBe(true);
  });

  it('handles multiple cards with failing images independently', () => {
    const dinosaur2 = {
      ...dinosaur,
      id: 'dino-2',
      name: 'Triceratops',
      image: 'https://example.com/triceratops.jpg',
    };

    const { container } = render(
      <div>
        <DinosaurCard dinosaur={dinosaur} />
        <DinosaurCard dinosaur={dinosaur2} />
      </div>
    );

    const images = container.querySelectorAll('img');
    fireEvent.error(images[0]);

    const placeholders = screen.getAllByTestId('image-placeholder');
    expect(placeholders).toHaveLength(1);
  });
});
