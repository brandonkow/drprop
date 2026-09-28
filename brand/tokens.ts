/** Single source for CSS variables and future brand consumers. */
export const tokens = {
  bone: '#F4F1EA', paper: '#FBFAF7', ink: '#1C1B19', stone: '#8A857C',
  travertine: '#D9CFBF', bronze: '#8C6A43', night: '#141412', 'night-text': '#EDE9E1',
  'font-heading': '"Instrument Serif", Georgia, serif',
  'font-body': '"Geist", Arial, sans-serif',
  'font-number': '"Geist Mono", monospace',
  'space-unit': '8px', 'section-gap': '160px', 'section-gap-mobile': '96px',
  'radius': '2px', 'line-width': '1px', 'pulse-width': '1.5px',
  'ease': 'cubic-bezier(0.22, 1, 0.36, 1)', 'duration': '600ms',
} as const;
