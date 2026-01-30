/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Project type colors
        'wifi': '#28a745',
        'wifi-light': '#34ce57',
        'wifi-dark': '#1e7e34',
        'pnpki': '#dc3545',
        'pnpki-light': '#e4606d',
        'pnpki-dark': '#bd2130',
        'iidb': '#007bff',
        'iidb-light': '#4fa3ff',
        'iidb-dark': '#0056b3',
        'elgu': '#ffc107',
        'elgu-light': '#ffce3a',
        'elgu-dark': '#d39e00',
        // Status colors
        'status-done': '#22c55e',
        'status-pending': '#eab308',
        'status-inprogress': '#3b82f6',
        'status-cancelled': '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
