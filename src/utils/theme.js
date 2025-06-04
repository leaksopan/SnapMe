// SnapMe Studio Theme Configuration
// Rebranding 2024 - Blue Theme

import { colors, gradients, shadows } from './colors';

// Component themes
export const theme = {
  // Button themes
  button: {
    primary: {
      background: gradients.primary,
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      padding: '12px 24px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: shadows.primary
    },
    secondary: {
      background: gradients.secondary,
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      padding: '12px 24px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: shadows.info
    },
    outline: {
      background: 'white',
      color: colors.primary[600],
      border: `2px solid ${colors.primary[500]}`,
      borderRadius: '10px',
      padding: '12px 24px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    success: {
      background: gradients.success,
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      padding: '12px 24px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: shadows.success
    },
    warning: {
      background: gradients.warning,
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      padding: '12px 24px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: shadows.warning
    },
    danger: {
      background: gradients.danger,
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      padding: '12px 24px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: shadows.danger
    },
    info: {
      background: gradients.info,
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      padding: '12px 24px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: shadows.info
    },
    ghost: {
      background: 'transparent',
      color: colors.primary[600],
      border: `1px solid ${colors.primary[200]}`,
      borderRadius: '10px',
      padding: '12px 24px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    minimal: {
      background: 'transparent',
      color: colors.primary[600],
      border: 'none',
      borderRadius: '8px',
      padding: '8px 16px',
      fontSize: '0.9rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    }
  },

  // Card themes
  card: {
    default: {
      background: 'white',
      borderRadius: '15px',
      padding: '25px',
      boxShadow: shadows.primary,
      border: `1px solid ${colors.secondary[200]}`
    },
    featured: {
      background: 'white',
      borderRadius: '15px',
      padding: '25px',
      boxShadow: shadows.primaryMedium,
      border: `2px solid ${colors.primary[200]}`
    },
    highlighted: {
      background: gradients.primary,
      borderRadius: '15px',
      padding: '25px',
      boxShadow: shadows.primaryMedium,
      color: 'white'
    },
    success: {
      background: colors.success[50],
      borderRadius: '15px',
      padding: '25px',
      boxShadow: shadows.success,
      border: `1px solid ${colors.success[200]}`
    },
    warning: {
      background: colors.warning[50],
      borderRadius: '15px',
      padding: '25px',
      boxShadow: shadows.warning,
      border: `1px solid ${colors.warning[200]}`
    },
    danger: {
      background: colors.danger[50],
      borderRadius: '15px',
      padding: '25px',
      boxShadow: shadows.danger,
      border: `1px solid ${colors.danger[200]}`
    }
  },

  // Input themes
  input: {
    default: {
      width: '100%',
      padding: '12px 15px',
      border: `2px solid ${colors.secondary[200]}`,
      borderRadius: '8px',
      fontSize: '1rem',
      transition: 'all 0.3s ease',
      outline: 'none'
    },
    focus: {
      borderColor: colors.primary[500],
      boxShadow: `0 0 0 3px rgba(37, 99, 235, 0.1)`
    },
    error: {
      borderColor: colors.danger[500],
      boxShadow: `0 0 0 3px rgba(220, 38, 38, 0.1)`
    },
    success: {
      borderColor: colors.success[500],
      boxShadow: `0 0 0 3px rgba(13, 148, 136, 0.1)`
    },
    warning: {
      borderColor: colors.warning[500],
      boxShadow: `0 0 0 3px rgba(245, 158, 11, 0.1)`
    }
  },

  // Navigation theme
  navigation: {
    sidebar: {
      background: gradients.primary,
      width: {
        open: '280px',
        closed: '70px'
      },
      boxShadow: shadows.primaryMedium,
      transition: 'width 0.3s ease'
    },
    menuItem: {
      active: {
        background: 'rgba(59, 130, 246, 0.3)',
        borderLeft: `4px solid ${colors.primary[400]}`
      },
      hover: {
        background: 'rgba(255, 255, 255, 0.1)'
      }
    }
  },

  // Typography
  typography: {
    heading: {
      h1: {
        fontSize: '2rem',
        fontWeight: '700',
        color: colors.primary[800],
        lineHeight: '1.2'
      },
      h2: {
        fontSize: '1.5rem',
        fontWeight: '600',
        color: colors.primary[800],
        lineHeight: '1.3'
      },
      h3: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: colors.primary[700],
        lineHeight: '1.4'
      }
    },
    body: {
      large: {
        fontSize: '1.1rem',
        lineHeight: '1.6',
        color: colors.secondary[700]
      },
      regular: {
        fontSize: '1rem',
        lineHeight: '1.5',
        color: colors.secondary[600]
      },
      small: {
        fontSize: '0.875rem',
        lineHeight: '1.4',
        color: colors.secondary[500]
      }
    }
  },

  // Status themes
  status: {
    success: {
      background: colors.success[50],
      color: colors.success[700],
      border: `1px solid ${colors.success[200]}`,
      borderRadius: '8px',
      padding: '12px'
    },
    warning: {
      background: colors.warning[50],
      color: colors.warning[700],
      border: `1px solid ${colors.warning[200]}`,
      borderRadius: '8px',
      padding: '12px'
    },
    error: {
      background: colors.danger[50],
      color: colors.danger[700],
      border: `1px solid ${colors.danger[200]}`,
      borderRadius: '8px',
      padding: '12px'
    },
    info: {
      background: colors.info[50],
      color: colors.info[700],
      border: `1px solid ${colors.info[200]}`,
      borderRadius: '8px',
      padding: '12px'
    }
  }
};

// Button size variants
export const buttonSizes = {
  small: {
    padding: '8px 16px',
    fontSize: '0.875rem',
    borderRadius: '6px'
  },
  medium: {
    padding: '12px 24px',
    fontSize: '1rem',
    borderRadius: '8px'
  },
  large: {
    padding: '16px 32px',
    fontSize: '1.125rem',
    borderRadius: '10px'
  },
  xlarge: {
    padding: '20px 40px',
    fontSize: '1.25rem',
    borderRadius: '12px'
  }
};

// Utility functions for dynamic styling
export const createHoverEffect = (baseStyle, hoverStyle) => ({
  ...baseStyle,
  ':hover': hoverStyle
});

export const createFocusEffect = (baseStyle, focusStyle) => ({
  ...baseStyle,
  ':focus': focusStyle
});

export const createResponsiveStyle = (mobile, tablet, desktop) => ({
  '@media (max-width: 768px)': mobile,
  '@media (min-width: 769px) and (max-width: 1024px)': tablet,
  '@media (min-width: 1025px)': desktop
});

// Animation presets
export const animations = {
  fadeIn: {
    animation: 'fadeIn 0.3s ease-in-out'
  },
  slideIn: {
    animation: 'slideIn 0.3s ease-out'
  },
  bounceIn: {
    animation: 'bounceIn 0.5s ease-out'
  },
  pulse: {
    animation: 'pulse 2s infinite'
  }
};

// Common layout patterns
export const layouts = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 20px'
  },
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  flexBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  grid: {
    twoColumn: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: '30px'
    },
    threeColumn: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '20px'
    },
    autoFit: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px'
    }
  }
};

export default theme; 