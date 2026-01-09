/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./public/**/*.html",
        "./public/**/*.js",
    ],
    theme: {
        extend: {
            colors: {
                // Catppuccin Mocha Palette
                rosewater: '#f5e0dc',
                flamingo: '#f2cdcd',
                pink: '#f5c2e7',
                mauve: '#cba6f7',
                red: '#f38ba8',
                maroon: '#eba0ac',
                peach: '#fab387',
                yellow: '#f9e2af',
                green: '#a6e3a1',
                teal: '#94e2d5',
                sky: '#89dceb',
                sapphire: '#74c7ec',
                blue: '#89b4fa',
                lavender: '#b4befe',
                text: '#cdd6f4',
                subtext1: '#bac2de',
                subtext0: '#a6adc8',
                overlay2: '#9399b2',
                overlay1: '#7f849c',
                overlay0: '#6c7086',
                surface2: '#585b70',
                surface1: '#45475a',
                surface0: '#313244',
                base: '#1e1e2e',
                mantle: '#181825',
                crust: '#11111b',
                // Semantic Colors
                primary: '#cba6f7',
                'primary-dark': '#a78bfa',
                'primary-light': 'rgba(203, 166, 247, 0.12)',
                accent: '#b4befe',
                success: '#a6e3a1',
                warning: '#f9e2af',
                danger: '#f38ba8',
            },
            fontFamily: {
                sans: ['Outfit', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
            borderRadius: {
                'sm': '6px',
                'md': '12px',
                'lg': '16px',
                'xl': '24px',
                '2xl': '32px',
            },
            boxShadow: {
                'sm': '0 2px 8px rgba(0, 0, 0, 0.15)',
                'md': '0 8px 24px rgba(0, 0, 0, 0.2)',
                'lg': '0 16px 48px rgba(0, 0, 0, 0.25)',
                'glow': '0 0 20px rgba(203, 166, 247, 0.15)',
                'glow-primary': '0 0 25px rgba(203, 166, 247, 0.4)',
            },
            animation: {
                'spin': 'spin 0.8s linear infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'float': 'float 15s infinite ease-in-out',
                'slideIn': 'slideIn 0.3s ease forwards',
                'fadeIn': 'fadeIn 0.3s ease forwards',
                'pulse': 'pulse 2s ease-in-out infinite',
            },
            keyframes: {
                shimmer: {
                    from: { backgroundPosition: '200% 0' },
                    to: { backgroundPosition: '-200% 0' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0) scale(1)', opacity: '0.3' },
                    '50%': { transform: 'translateY(-30px) scale(1.2)', opacity: '0.6' },
                },
                slideIn: {
                    from: { opacity: '0', transform: 'translateX(100%)' },
                    to: { opacity: '1', transform: 'translateX(0)' },
                },
                fadeIn: {
                    from: { opacity: '0', transform: 'translateY(5px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}
