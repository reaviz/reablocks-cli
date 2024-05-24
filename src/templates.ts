export const CONTENT_NEXT_APP_DIR = `[
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./node_modules/reablocks/**/*.{js,jsx,ts,tsx}",
  ]`;

export const CONTENT_NEXT_SRC_DIR = `[
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/reablocks/**/*.{js,jsx,ts,tsx}",
  ]`;

export const CONTENT_NEXT_PAGES_DIR = `[
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./node_modules/reablocks/**/*.{js,jsx,ts,tsx}",
  ]`;

export const CONTENT_VITE = `[
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/reablocks/**/*.{js,jsx,ts,tsx}",
  ]`;

export const CONTENT_REDWOOD = `[
    "src/**/*.{js,jsx,ts,tsx}",
    "../node_modules/reablocks/**/*.{js,jsx,ts,tsx}",
  ]`;

export const CONTENT_CRA = `[
    "./src/**/*.{js,jsx,ts,tsx}",
    "../node_modules/reablocks/**/*.{js,jsx,ts,tsx}",
  ]`;

export const CONTENT_REFINE = `[
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/reablocks/**/*.{js,jsx,ts,tsx}",
  ]`;

export const SAFELIST = `[
    {
      pattern:
        /^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
  ]`;

export const THEME = `{
  extend: {
    colors: {
      primary: {
        DEFAULT: colorPalette.blue[500],
        active: colorPalette.blue[500],
        hover: colorPalette.blue[600],
        inactive: colorPalette.blue[200]
      },
      secondary: {
        DEFAULT: colorPalette.gray[700],
        active: colorPalette.gray[700],
        hover: colorPalette.gray[800],
        inactive: colorPalette.gray[400]
      },
      success: {
        DEFAULT: colorPalette.green[500],
        active: colorPalette.green[500],
        hover: colorPalette.green[600]
      },
      error: {
        DEFAULT: colorPalette.red[500],
        active: colorPalette.red[500],
        hover: colorPalette.red[600]
      },
      warning: {
        DEFAULT: colorPalette.orange[500],
        active: colorPalette.orange[500],
        hover: colorPalette.orange[600]
      },
      info: {
        DEFAULT: colorPalette.blue[500],
        active: colorPalette.blue[500],
        hover: colorPalette.blue[600]
      },
      background: {
        level1: colorPalette.white,
        level2: colorPalette.gray[950],
        level3: colorPalette.gray[900],
        level4: colorPalette.gray[800],
      },
      panel: colorPalette['black-pearl'],
      surface: colorPalette['charade'],
      typography: {
        DEFAULT: colorPalette['athens-gray'],
      },
      accent: {
        DEFAULT: colorPalette['waterloo'],
        active: colorPalette['anakiwa']
      },
    }
  }
}`;

export const PLUGINS = `[
  plugin(({ addVariant }) => {
    addVariant('disabled-within', '&:has(input:is(:disabled),button:is(:disabled))');
  })
]`;
