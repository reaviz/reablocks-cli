import {
  CONTENT_CRA,
  CONTENT_NEXT_APP_DIR,
  CONTENT_NEXT_PAGES_DIR,
  CONTENT_NEXT_SRC_DIR,
  CONTENT_REDWOOD,
  CONTENT_REFINE,
  CONTENT_VITE,
  THEME,
  PLUGINS,
} from "../templates";
import { FrameworkConfigType } from "../types";

const tailwindContentConfigs: { [key in FrameworkConfigType]: string } = {
  NEXT_APP_DIR: CONTENT_NEXT_APP_DIR,
  NEXT_SRC_DIR: CONTENT_NEXT_SRC_DIR,
  NEXT_PAGES_DIR: CONTENT_NEXT_PAGES_DIR,
  VITE: CONTENT_VITE,
  REFINE: CONTENT_REFINE,
  REDWOOD: CONTENT_REDWOOD,
  CRA: CONTENT_CRA,
};

export const getTailwindConfig = (frameworkConfigType: FrameworkConfigType) => {
  const contentConfig = tailwindContentConfigs[frameworkConfigType];
  return `/** @type {import('tailwindcss').Config} */
/* eslint-disable max-len */
import plugin from 'tailwindcss/plugin';
import { colorPalette } from 'reablocks';

module.exports = {
  content: ${contentConfig},
  theme: ${THEME},
  plugins: ${PLUGINS},
};
`;
};
