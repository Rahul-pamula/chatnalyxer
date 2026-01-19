export const colors = {
    // Brand Colors - Instagram-inspired
    primary: '#6366f1', // Indigo 500
    primaryDark: '#4f46e5', // Indigo 600
    primaryLight: '#818cf8', // Indigo 400
    secondary: '#8b5cf6', // Purple 500
    accent: '#06b6d4', // Cyan 500

    // Semantic Colors
    success: '#10b981', // Emerald 500
    warning: '#f59e0b', // Amber 500
    error: '#ef4444', // Red 500
    info: '#3b82f6', // Blue 500

    // Text Colors - Light Mode
    textPrimary: '#0f172a', // Slate 900
    textSecondary: '#64748b', // Slate 500
    textTertiary: '#94a3b8', // Slate 400
    textInverse: '#ffffff', // White

    // Backgrounds - Light Mode
    background: '#f8fafc', // Slate 50
    surface: '#ffffff', // White
    surfaceHighlight: '#f1f5f9', // Slate 100

    // Borders - Light Mode
    border: '#e2e8f0', // Slate 200

    // Glassmorphism
    glass: 'rgba(255, 255, 255, 0.7)',
    glassDark: 'rgba(15, 23, 42, 0.7)',
};

// Gradient definitions for modern backgrounds
export const gradients = {
    primary: ['#6366f1', '#8b5cf6'], // Indigo to Purple
    secondary: ['#8b5cf6', '#ec4899'], // Purple to Pink
    success: ['#10b981', '#059669'], // Emerald gradient
    danger: ['#ef4444', '#dc2626'], // Red gradient
    sunset: ['#f59e0b', '#ef4444'], // Amber to Red
    ocean: ['#06b6d4', '#3b82f6'], // Cyan to Blue
    royal: ['#4f46e5', '#7c3aed'], // Deep Indigo to Violet
};

export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 12,
    },
    xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.25,
        shadowRadius: 30,
        elevation: 20,
    },
    // Colored shadows for premium feel
    primaryGlow: {
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    dangerGlow: {
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
};

// Animation timing constants
export const animations = {
    fast: 200,
    normal: 300,
    slow: 500,
    springConfig: {
        damping: 15,
        stiffness: 150,
    },
};
