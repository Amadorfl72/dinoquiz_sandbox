import React from 'react';

export const Button = ({ children, onClick, ...rest }) => (
  <button type="button" onClick={onClick} {...rest}>
    {children}
  </button>
);

export default Button;
