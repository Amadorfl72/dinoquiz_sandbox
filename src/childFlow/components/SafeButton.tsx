import React from 'react';

type SafeButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'href'> & {
  label: string;
};

export function SafeButton({ label, children, ...rest }: SafeButtonProps) {
  return (
    <button type="button" aria-label={label} {...rest}>
      {children ?? label}
    </button>
  );
}
