/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1E3A5F',
        primaryDark: '#12314E',
        secondary: '#4F8EF7',
        success: '#22C55E',
        danger: '#EF4444',
        surface: '#F5F7FB',
        accent: '#2FA84F',
        amber: '#F5A623',
        coral: '#E85D75',
        violet: '#7C6FE0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
