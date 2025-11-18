/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#020617',
        aurora: '#0ea5e9',
        mint: '#5eead4',
        slate: '#94a3b8',
      },
      boxShadow: {
        glow: '0 20px 80px rgba(14, 165, 233, 0.25)',
      },
      backgroundImage: {
        'grid-glow':
          'linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 0), linear-gradient(180deg, rgba(148, 163, 184, 0.08) 1px, transparent 0)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        pulseSoft: 'pulseSoft 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: 0.6 },
          '50%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}

