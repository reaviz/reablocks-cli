export function getPostcssСjs() {
  return `/* eslint-disable no-undef */
// eslint-disable-next-line no-undef
module.exports = {
  plugins: [require('@tailwindcss/postcss')]
};
`;
}
