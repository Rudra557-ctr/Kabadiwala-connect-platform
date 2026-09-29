import type { Config } from 'tailwindcss';

/**
 * Design tokens.
 *
 * ---------------------------------------------------------------------------
 * TWO AUDIENCES, ONE BRAND
 * ---------------------------------------------------------------------------
 * The collector and the recycler are not the same person and should not get
 * the same interface temperature:
 *
 *  - COLLECTOR: works outdoors, may not read, needs warmth and boldness.
 *    Warm off-white surfaces, amber accents, larger type, rounder shapes.
 *
 *  - BUSINESS (recycler, ministry): reads spreadsheets, files EPR returns,
 *    wants to be taken seriously. Cool neutral surfaces, slate accents,
 *    denser layout, restrained colour.
 *
 * Both keep the same emerald brand colour so it still reads as one product.
 * The difference is surface temperature and how loudly colour is used — set
 * per-surface via `data-surface` in globals.css.
 *
 * Colour discipline: saturated blocks are RARE. Earlier every card was a
 * full-bleed gradient, so nothing stood out and it read as a template. Now a
 * screen gets ONE hero at most; everything else is a neutral card with a small
 * coloured icon chip. Hierarchy comes from restraint.
 * ---------------------------------------------------------------------------
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deeper and less neon than a stock green — reads as money and trust
        // rather than as a recycling clip-art icon.
        brand: {
          50: '#eefbf4',
          100: '#d6f5e3',
          200: '#b0eacb',
          300: '#7bd8ac',
          400: '#44bf89',
          500: '#1fa06d',
          600: '#0d7c55',
          700: '#0a6246',
          800: '#0a4e39',
          900: '#093f30',
          950: '#04241b',
        },
        // Warm accent — value, money, "something good happened".
        amber: {
          50: '#fdf8ed',
          100: '#f9edd0',
          200: '#f3d9a2',
          300: '#ebbf6a',
          400: '#e3a33d',
          500: '#d9881f',
          600: '#bf6a16',
          700: '#9e4e15',
          800: '#813e18',
          900: '#6b3417',
        },
        // Business neutral — headers, data surfaces, the professional register.
        slate: {
          50: '#f6f8fa',
          100: '#eceff3',
          200: '#d5dbe3',
          300: '#b0bbc9',
          400: '#8595a9',
          500: '#65768d',
          600: '#505e74',
          700: '#414c5e',
          800: '#38414f',
          900: '#323945',
          950: '#1c2028',
        },
        fair: { low: '#c2321f', ok: '#d9881f', good: '#0d7c55' },
        danger: '#c2321f',
        warn: '#d9881f',
      },
      fontSize: {
        price: ['2.5rem', { lineHeight: '1.05', fontWeight: '800', letterSpacing: '-0.025em' }],
        'price-lg': ['3.25rem', { lineHeight: '1', fontWeight: '800', letterSpacing: '-0.03em' }],
      },
      minHeight: { touch: '3rem' },
      minWidth: { touch: '3rem' },
      boxShadow: {
        // Softer and lower-contrast than before. The old shadows were heavy
        // enough that every card looked like it was floating off the page.
        e1: '0 1px 2px 0 rgb(28 32 40 / 0.05), 0 1px 1px 0 rgb(28 32 40 / 0.03)',
        e2: '0 2px 4px -1px rgb(28 32 40 / 0.06), 0 4px 10px -2px rgb(28 32 40 / 0.05)',
        e3: '0 4px 8px -2px rgb(28 32 40 / 0.05), 0 12px 20px -6px rgb(28 32 40 / 0.08)',
        e4: '0 10px 20px -6px rgb(28 32 40 / 0.10), 0 24px 40px -12px rgb(28 32 40 / 0.12)',
        'glow-brand': '0 10px 26px -10px rgb(13 124 85 / 0.55)',
        'glow-amber': '0 10px 26px -10px rgb(217 136 31 / 0.50)',
      },
      backgroundImage: {
        // Subtle two-stop gradients within a single hue. The previous ones
        // crossed hues and looked synthetic.
        'grad-brand': 'linear-gradient(145deg, #0d7c55 0%, #0a4e39 100%)',
        'grad-amber': 'linear-gradient(145deg, #d9881f 0%, #9e4e15 100%)',
        'grad-slate': 'linear-gradient(145deg, #414c5e 0%, #1c2028 100%)',
        'grad-teal': 'linear-gradient(145deg, #12707a 0%, #0c4a52 100%)',
        dots: 'radial-gradient(rgb(255 255 255 / 0.10) 1px, transparent 1px)',
      },
      backgroundSize: { dots: '16px 16px' },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translate3d(0,8px,0)' },
          to: { opacity: '1', transform: 'translate3d(0,0,0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          from: { transform: 'translate3d(0,100%,0)' },
          to: { transform: 'translate3d(0,0,0)' },
        },
        shimmer: {
          from: { transform: 'translate3d(-100%,0,0)' },
          to: { transform: 'translate3d(100%,0,0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.92)', opacity: '0.55' },
          '70%': { transform: 'scale(1.5)', opacity: '0' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 340ms cubic-bezier(0.22,1,0.36,1) both',
        'pop-in': 'pop-in 260ms cubic-bezier(0.22,1,0.36,1) both',
        'slide-up': 'slide-up 260ms cubic-bezier(0.22,1,0.36,1) both',
        shimmer: 'shimmer 1.5s infinite',
        'pulse-ring': 'pulse-ring 2.2s cubic-bezier(0.22,1,0.36,1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
