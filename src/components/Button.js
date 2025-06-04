import React from 'react';
import { theme, buttonSizes } from '../utils/theme';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  loading = false,
  onClick,
  type = 'button',
  className = '',
  style = {},
  ...props 
}) => {
  const buttonStyle = {
    ...theme.button[variant],
    ...buttonSizes[size],
    ...(disabled && {
      opacity: 0.6,
      cursor: 'not-allowed'
    }),
    ...style
  };

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      className={`snap-button snap-button--${variant} snap-button--${size} ${className}`}
      style={buttonStyle}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span 
          style={{
            display: 'inline-block',
            width: '16px',
            height: '16px',
            border: '2px solid currentColor',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '8px'
          }}
        />
      )}
      {children}
    </button>
  );
};

// Helper components untuk different variants
export const PrimaryButton = (props) => <Button variant="primary" {...props} />;
export const SecondaryButton = (props) => <Button variant="secondary" {...props} />;
export const OutlineButton = (props) => <Button variant="outline" {...props} />;
export const SuccessButton = (props) => <Button variant="success" {...props} />;
export const WarningButton = (props) => <Button variant="warning" {...props} />;
export const DangerButton = (props) => <Button variant="danger" {...props} />;
export const InfoButton = (props) => <Button variant="info" {...props} />;
export const GhostButton = (props) => <Button variant="ghost" {...props} />;
export const MinimalButton = (props) => <Button variant="minimal" {...props} />;

export default Button; 