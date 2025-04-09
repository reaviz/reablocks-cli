#!/usr/bin/env node
import path from "path";
import fs from "fs-extra";
import { type PackageJson } from "type-fest";
import { Command } from "commander";
import { getViteConfig } from './utils/get-vite-config';
import { logger } from "./utils/logger";
import prompts from "prompts";
import ora from "ora";
import { execa } from "execa";
import { getFrameworkConfigType } from "./utils/get-framework-config-type";
import { getPackageManager } from "./utils/get-package-manager";
import { updateIndexCss } from './utils/update-index-css';
import { updatePostCssConfig } from './utils/update-post-css-config';

export function getPackageInfo() {
  const packageJsonPath = path.join("package.json");

  return fs.readJSONSync(packageJsonPath) as PackageJson;
}

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

async function main() {
  const packageInfo = await getPackageInfo();
  const packageManager = getPackageManager();

  const program = new Command()
    .name("Reablocks CLI")
    .description(
      packageInfo.description ?? "Configures Reablocks in your project."
    )
    .version(
      packageInfo.version || "1.0.0",
      "-v, --version",
      "display the version number"
    );

  program
    .command("init")
    .description("Configures Reablocks in your project.")
    .option("-y, --yes", "Skip confirmation prompt.")
    .action(async (options) => {
      // logger.warn("This command assumes a React project with Tailwind CSS.");
      logger.warn("This command assumes a React project.");
      logger.warn(
        "If you don't have these, follow the manual steps at https://reablocks.dev/docs/getting-started/setup"
      );
      logger.warn("");

      // Promt framework type.
      const { framework } = await prompts({
        type: "select",
        name: "framework",
        message: "Which framework are you using?",
        choices: [
          { title: "Next", value: "next" },
          { title: "Vite", value: "vite" },
          { title: "Refine", value: "refine" },
          { title: "Redwood", value: "redwood" },
          { title: "Create React App", value: "cra" },
          { title: "Other", value: "other" },
        ],
      });

      // Infer the type of the framework configuration
      const frameworkConfigType = getFrameworkConfigType(framework);

      if (!options.yes) {
        const { proceed } = await prompts({
          type: "confirm",
          name: "proceed",
          message:
            "Running this command will install dependencies and modify some files. Proceed?",
          initial: true,
        });

        if (!proceed) {
          process.exit(0);
        }
      }

      const { indexCssPath } = await prompts({
        type: "text",
        name: "indexCssPath",
        message: "Where is your index.css file located?",
        initial: "src/app/globals.css",
      });

      // Install reablocks
      const reablocksSpinner = ora(`Installing reablocks...`).start();
      await execa(packageManager, [
        packageManager === "npm" ? "install" : "add",
        "reablocks@latest",
      ]);
      reablocksSpinner.succeed();

      const tailwindcssSpinner = ora(`Installing tailwindcss...`).start();
      await execa(packageManager, [
        packageManager === "npm" ? "install" : "add",
        "tailwindcss@4.x",
        packageManager === "npm" || packageManager === "pnpm"
          ? "--save-dev"
          : "--dev",
      ]);
      await execa(packageManager, [
        packageManager === "npm" ? "install" : "add",
        "@tailwindcss/postcss@latest",
        packageManager === "npm" || packageManager === "pnpm"
          ? "--save-dev" 
          : "--dev",
      ]);
      tailwindcssSpinner.succeed();

      const postcssSpinner = ora(`Installing postcss...`).start();
      await execa(packageManager, [
        packageManager === "npm" ? "install" : "add",
        "postcss@latest",
        packageManager === "npm" || packageManager === "pnpm"
          ? "--save-dev"
          : "--dev",
      ]);
      postcssSpinner.succeed();

      const cssSpinner = ora(
        'Inserting css...'
      ).start();
      await updateIndexCss(indexCssPath)
      cssSpinner.succeed();

      // Check the kind of tailwind (TypeScript/JavaScript)
      const isTypeScriptConfigFile = fs.existsSync("tailwind.config.ts");

      // Infer the name of the tailwind config file accordingly
      const tailwindConfigFileName = isTypeScriptConfigFile
        ? "tailwind.config.ts"
        : "tailwind.config.js";
      const tailwindDestination = `./${tailwindConfigFileName}`;

      // Check if the tailwind config file already exists
      const tailwindConfigFileExists = fs.existsSync(tailwindDestination);

      // If the config file already exists, delete it
      if (tailwindConfigFileExists) {
        const deleteSpinner = ora(`Removing existing ${tailwindConfigFileName}...`).start();
        await fs.remove(tailwindDestination);
        deleteSpinner.succeed();
      }

      // Updates the Vite configuration file
      if (framework === "vite") {
        const viteSpinner = ora(
          `Configuring ${frameworkConfigType}...`
        ).start();
        await execa(packageManager, [
          packageManager === "npm" ? "install" : "add",
          "@tailwindcss/vite",
          packageManager === "npm" || packageManager === "pnpm"
            ? "--save-dev"
            : "--dev",
        ]);
        await getViteConfig();
        viteSpinner.succeed();
      }

      // Updates the PostCSS configuration file.
      const postCssSpinner = ora(
        `Updating postcss.config.cjs...`
      ).start();
      await updatePostCssConfig(frameworkConfigType);
      postCssSpinner.succeed();
    });

  program.parse();
}

main();
