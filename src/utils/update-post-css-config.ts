import path from "path";
import fs from "fs-extra";
import { getPostcssMjs } from './get-postcss-mjs';
import { getPostcssСjs } from './get-postcss-сjs';

export const updatePostCssConfig = async (frameworkConfigType: string) => {
  // Check if postcss.config.cjs or postcss.config.mjs exists
  const postcssConfigFileCjs = fs.existsSync("postcss.config.cjs");
  const postcssConfigFileMjs = fs.existsSync("postcss.config.mjs");

  // Determine which config file to update
  const postcssConfigPath = postcssConfigFileCjs
    ? path.resolve("postcss.config.cjs")
    : postcssConfigFileMjs
      ? path.resolve("postcss.config.mjs")
      : null;

  // If no PostCSS config file found, skip update
  if (!postcssConfigPath) {
    console.log("⚠️ No PostCSS config file found, skipping update.");
    return;
  }

  // Replace the content of the config with the new structure
  const newConfig = postcssConfigFileCjs ? getPostcssСjs() : getPostcssMjs();

  // Write the updated config back to the file
  await fs.writeFile(postcssConfigPath, newConfig, "utf8");

  console.log("✅ PostCSS configuration updated.");
};
