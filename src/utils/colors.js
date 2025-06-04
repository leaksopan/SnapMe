// SnapMe Studio - Blue Theme Color Palette
// Rebranding 2024

export const colors = {
  // Primary Blue Colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe', 
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#2563eb', // Main primary
    600: '#1d4ed8',
    700: '#1e40af',
    800: '#1e3a8a',
    900: '#1e293b'
  },

  // Secondary Colors
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a'
  },

  // Success Colors (Teal-Green yang lebih sesuai dengan blue theme)
  success: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#0d9488', // Main success - teal yang lebih sesuai dengan blue
    600: '#0f766e',
    700: '#115e59',
    800: '#134e4a',
    900: '#134e4a'
  },

  // Danger Colors (Red)
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#dc2626', // Main danger
    600: '#b91c1c',
    700: '#991b1b',
    800: '#7f1d1d',
    900: '#450a0a'
  },

  // Warning Colors (Blue-Orange yang lebih sesuai dengan blue theme)
  warning: {
    50: '#fefce8',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Main warning - orange yang lebih soft dan sesuai dengan blue
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#451a03'
  },

  // Info Colors (Light Blue untuk informational elements)
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Info blue
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e'
  },

  // Purple Accent (untuk elements khusus jika diperlukan)
  purple: {
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9'
  }
};

// Gradient combinations
export const gradients = {
  primary: `linear-gradient(135deg, ${colors.primary[500]} 0%, ${colors.primary[600]} 50%, ${colors.primary[700]} 100%)`,
  primaryLight: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[700]} 100%)`,
  primaryDark: `linear-gradient(135deg, ${colors.primary[800]} 0%, ${colors.primary[500]} 100%)`,
  secondary: `linear-gradient(135deg, ${colors.primary[400]} 0%, ${colors.info[500]} 100%)`, // Secondary blue gradient
  success: `linear-gradient(135deg, ${colors.success[500]} 0%, ${colors.success[600]} 100%)`,
  danger: `linear-gradient(135deg, ${colors.danger[500]} 0%, ${colors.danger[600]} 100%)`,
  warning: `linear-gradient(135deg, ${colors.warning[500]} 0%, ${colors.warning[600]} 100%)`,
  info: `linear-gradient(135deg, ${colors.info[500]} 0%, ${colors.info[600]} 100%)`,
  background: `linear-gradient(135deg, ${colors.primary[500]} 0%, ${colors.primary[600]} 50%, ${colors.primary[800]} 100%)`
};

// Shadow combinations
export const shadows = {
  primary: `0 4px 15px rgba(37, 99, 235, 0.1)`,
  primaryMedium: `0 8px 25px rgba(37, 99, 235, 0.2)`,
  primaryLarge: `0 20px 40px rgba(37, 99, 235, 0.2)`,
  success: `0 4px 15px rgba(13, 148, 136, 0.25)`,
  danger: `0 4px 15px rgba(220, 38, 38, 0.3)`,
  warning: `0 4px 15px rgba(245, 158, 11, 0.25)`,
  info: `0 4px 15px rgba(14, 165, 233, 0.25)`,
  soft: `0 2px 10px rgba(37, 99, 235, 0.08)`
};

export default colors; 