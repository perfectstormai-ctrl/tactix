import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export default function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  const base = 'px-3 py-1 rounded text-sm focus:outline-none focus:ring';
  const styles: Record<string, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  };
  return (
    <button
      className={`${base} ${styles[variant]} ${className}`}
      {...rest}
    />
  );
}
