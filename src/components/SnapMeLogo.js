import React from 'react';
import { colors, gradients } from '../utils/colors';

const SnapMeLogo = ({ size = 'medium', variant = 'horizontal', showText = true }) => {
  const sizeConfig = {
    small: { logoSize: '24px', fontSize: '1rem', gap: '8px' },
    medium: { logoSize: '32px', fontSize: '1.2rem', gap: '12px' },
    large: { logoSize: '48px', fontSize: '1.8rem', gap: '16px' },
    xlarge: { logoSize: '64px', fontSize: '2.4rem', gap: '20px' }
  };

  const config = sizeConfig[size];

  const logoStyle = {
    display: 'flex',
    alignItems: 'center',
    flexDirection: variant === 'vertical' ? 'column' : 'row',
    gap: config.gap,
    color: 'white'
  };

  const iconStyle = {
    width: config.logoSize,
    height: config.logoSize,
    background: gradients.primaryLight,
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `calc(${config.logoSize} * 0.6)`,
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
    border: '2px solid rgba(255, 255, 255, 0.2)'
  };

  const textStyle = {
    fontWeight: '700',
    fontSize: config.fontSize,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    textAlign: variant === 'vertical' ? 'center' : 'left',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
  };

  const taglineStyle = {
    fontSize: `calc(${config.fontSize} * 0.6)`,
    opacity: 0.8,
    fontWeight: '400',
    marginTop: variant === 'vertical' ? '4px' : '0',
    marginLeft: variant === 'horizontal' ? '0' : '0'
  };

  return (
    <div style={logoStyle}>
      <div style={iconStyle}>
        📸
      </div>
      {showText && (
        <div>
          <div style={textStyle}>
            SnapMe Studio
          </div>
          {size !== 'small' && (
            <div style={taglineStyle}>
              Sistem Kasir Modern
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Logo dengan background card
export const SnapMeLogoCard = ({ children, className = '' }) => {
  return (
    <div 
      className={`snapme-logo-card ${className}`}
      style={{
        background: gradients.primary,
        borderRadius: '20px',
        padding: '30px',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(37, 99, 235, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), 
                     radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)`,
        pointerEvents: 'none'
      }} />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <SnapMeLogo size="large" variant="vertical" />
        {children}
      </div>
    </div>
  );
};

// Icon only untuk mobile/compact view
export const SnapMeIcon = ({ size = '32px' }) => {
  return (
    <div style={{
      width: size,
      height: size,
      background: gradients.primaryLight,
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `calc(${size} * 0.6)`,
      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    }}>
      📸
    </div>
  );
};

export default SnapMeLogo; 