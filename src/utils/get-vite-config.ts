import path from "path";
import fs from "fs-extra";

export async function getViteConfig() {
  const viteConfigPath = path.resolve("vite.config.ts");

  if (!fs.existsSync(viteConfigPath)) {
    console.log("⚠️ vite.config.ts not found, skipping Vite configuration update.");
    return;
  }

  let viteConfig = await fs.readFile(viteConfigPath, "utf8");

  // Check if TailwindCSS import is already present (single or double quotes)
  const tailwindImportRegex = /import tailwindcss from ['"]@tailwindcss\/vite['"]/;
  if (!tailwindImportRegex.test(viteConfig)) {
    viteConfig = `import tailwindcss from "@tailwindcss/vite";\n${viteConfig}`;
  } else {
    console.log("⚠️ TailwindCSS is already imported, skipping import.");
  }

  // Match the plugins array and check if the tailwindcss plugin is already included
  const pluginsRegex = /(plugins:\s*\[)(\n?)([ \t]*)/s;
  const tailwindPluginRegex = /tailwindcss\(\)/;

  if (pluginsRegex.test(viteConfig)) {
    viteConfig = viteConfig.replace(pluginsRegex, (_, start, newline, indent) => {
      const actualIndent = indent || "  "; // default to 2 spaces if no indent

      // Check if tailwindcss() is already in the plugins array
      if (tailwindPluginRegex.test(viteConfig)) {
        console.log("⚠️ TailwindCSS plugin is already in the plugins array, skipping addition.");
        return _;
      }

      return `${start}${newline}${actualIndent}tailwindcss(),${newline}${actualIndent}`;
    });
  } else {
    console.log("⚠️ 'plugins' array not found in vite.config.ts, skipping TailwindCSS plugin addition.");
  }

  // Write the updated config back to the file
  await fs.writeFile(viteConfigPath, viteConfig, "utf8");
  console.log("✅ Vite configuration updated with Tailwind CSS.");
}
