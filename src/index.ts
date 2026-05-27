#!/usr/bin/env node
import path from "path";
import fs from "fs-extra";
import { type PackageJson } from "type-fest";
import { Command } from "commander";
import { logger } from "./utils/logger";
import prompts from "prompts";
import ora from "ora";
import { execa } from "execa";
import { getPackageManager } from "./utils/get-package-manager";
import { findEntryFile } from "./utils/find-entry-file";
import {
  wireThemeProvider,
  themeProviderInstructions,
} from "./utils/wire-theme-provider";
import {
  findCssFile,
  suggestedCssPath,
  buildCssWire,
  tailwindCssInstructions,
} from "./utils/wire-tailwind-css";
import {
  ThemeChoice,
  themeClassFor,
  findHtmlHost,
  wireThemeClass,
  themeClassInstructions,
} from "./utils/wire-theme-class";
import { detectFrameworkFromPackageJson } from "./utils/detect-framework";
import { Framework } from "./types";

export function getPackageInfo() {
  const packageJsonPath = path.join("package.json");

  return fs.readJSONSync(packageJsonPath) as PackageJson;
}

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

interface FileWrite {
  path: string;
  content: string;
}

// Shared preview + confirm + write step. All three wiring stages
// (CSS, html theme class, ThemeProvider) use this exact shape, so keep
// the prompt/skip wording in one place.
async function promptAndApply(opts: {
  previewHeading: string;
  preview?: string;
  additionalNote?: string;
  target: string;
  applyingLabel: string;
  writes: FileWrite[];
  instructionsOnSkip: string;
}): Promise<void> {
  logger.info("");
  logger.info(opts.previewHeading);
  if (opts.preview) {
    console.log(opts.preview);
  }
  if (opts.additionalNote) {
    logger.info("");
    logger.info(opts.additionalNote);
  }

  const { confirmed } = await prompts({
    type: "confirm",
    name: "confirmed",
    message: `Apply this change to ${opts.target}?`,
    initial: true,
  });

  if (!confirmed) {
    logger.info("");
    logger.info("Skipped. Apply manually:");
    logger.info(opts.instructionsOnSkip);
    return;
  }

  const writeSpinner = ora(opts.applyingLabel).start();
  for (const w of opts.writes) {
    await fs.writeFile(w.path, w.content, "utf8");
  }
  writeSpinner.succeed();
}

async function main() {
  const packageInfo = await getPackageInfo();
  const packageManager = getPackageManager();

  const program = new Command()
    .name("Reablocks CLI")
    .description(
      packageInfo.description ?? "Configures Reablocks in your project."
    )
    .version(
      packageInfo.version ?? "1.0.0",
      "-v, --version",
      "display the version number"
    );

  program
    .command("init")
    .description("Configures Reablocks in your project.")
    .option("-y, --yes", "Skip confirmation prompt.")
    .action(async (options) => {
      logger.warn("This command assumes a React project.");
      logger.warn(
        "If you don't have these, follow the manual steps at https://reablocks.dev/docs/getting-started/setup"
      );
      logger.warn("");

      // Prompt framework type.
      const frameworkChoices: { title: string; value: Framework }[] = [
        { title: "Next", value: "next" },
        { title: "Vite", value: "vite" },
        { title: "React Router (RR7 / Remix)", value: "react-router" },
        { title: "Refine", value: "refine" },
        { title: "Redwood", value: "redwood" },
        { title: "Create React App", value: "cra" },
        { title: "Other", value: "other" },
      ];

      const detected = detectFrameworkFromPackageJson();
      const detectedIndex = detected
        ? frameworkChoices.findIndex((c) => c.value === detected)
        : -1;
      if (detected) {
        logger.info(
          `Detected ${detected} from package.json — pre-selecting in prompt.`
        );
      }

      const { framework } = await prompts({
        type: "select",
        name: "framework",
        message: "Which framework are you using?",
        choices: frameworkChoices,
        initial: detectedIndex >= 0 ? detectedIndex : 0,
      });

      // Prompt default theme.
      const themeChoiceOptions: { title: string; value: ThemeChoice }[] = [
        { title: "Dark (default)", value: "dark" },
        { title: "Light", value: "light" },
      ];
      const { themeChoice } = await prompts({
        type: "select",
        name: "themeChoice",
        message: "Default reablocks theme?",
        choices: themeChoiceOptions,
        initial: 0,
      });
      const themeClass = themeClassFor(themeChoice as ThemeChoice);

      if (!options.yes) {
        const { proceed } = await prompts({
          type: "confirm",
          name: "proceed",
          message:
            "Running this command will install dependencies and may modify your stylesheet + app entry. Proceed?",
          initial: true,
        });

        if (!proceed) {
          process.exit(0);
        }
      }

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

      // Wire Tailwind v4 + reablocks @source into the main stylesheet.
      const wireCssAt = async (cssPath: string) => {
        const cssContent = await fs.readFile(cssPath, "utf8");
        const cssResult = buildCssWire(cssPath, cssContent);

        if (!cssResult.changed) {
          if (cssResult.message) {
            logger.info(cssResult.message);
          }
          return;
        }

        await promptAndApply({
          previewHeading: "Will prepend to your stylesheet:",
          preview: cssResult.snippet,
          target: cssPath,
          applyingLabel: `Wiring Tailwind v4 into ${cssPath}...`,
          writes: [{ path: cssPath, content: cssResult.newContent }],
          instructionsOnSkip: tailwindCssInstructions(),
        });
      };

      const cssSpinner = ora(
        `Locating your main stylesheet for Tailwind v4...`
      ).start();
      const detectedCssPath = findCssFile(framework);

      if (detectedCssPath) {
        cssSpinner.succeed(`Found stylesheet: ${detectedCssPath}`);
        await wireCssAt(detectedCssPath);
      } else {
        cssSpinner.warn(`Could not auto-detect your main CSS file.`);

        const { manualCssPath } = await prompts({
          type: "text",
          name: "manualCssPath",
          message: "Where is your main stylesheet?",
          initial: suggestedCssPath(framework),
        });

        const trimmed = manualCssPath?.trim();
        const resolved = trimmed ? path.resolve(trimmed) : null;
        const exists =
          resolved &&
          fs.existsSync(resolved) &&
          fs.statSync(resolved).isFile();

        if (trimmed && exists) {
          await wireCssAt(trimmed);
        } else {
          if (trimmed && !exists) {
            logger.warn(`File not found at ${trimmed}.`);
          }
          logger.info("");
          logger.info(tailwindCssInstructions());
        }
      }

      // Detect entry file once — reused by the theme-class and ThemeProvider steps.
      const entry = findEntryFile(framework);

      // Wire the default theme class onto <html>.
      const themeClassSpinner = ora(
        `Locating <html> to set default theme class (${themeClass})...`
      ).start();
      const htmlHost = findHtmlHost(framework, entry);

      if (!htmlHost) {
        themeClassSpinner.warn(
          `Could not auto-detect a host file for the <html> theme class.`
        );
        logger.info("");
        logger.info(themeClassInstructions(themeClass));
      } else {
        themeClassSpinner.succeed(`Found host: ${htmlHost.path}`);

        const htmlContent = await fs.readFile(htmlHost.path, "utf8");
        const tcResult = wireThemeClass(htmlHost, htmlContent, themeClass);

        if (!tcResult.changed) {
          if (tcResult.message) {
            logger.info(tcResult.message);
          }
          if (tcResult.suggestion === "manual") {
            logger.info("");
            logger.info(themeClassInstructions(themeClass));
          }
        } else {
          await promptAndApply({
            previewHeading: "Proposed <html> tag:",
            preview: tcResult.snippetPreview,
            target: htmlHost.path,
            applyingLabel: `Adding ${themeClass} class to ${htmlHost.path}...`,
            writes: [{ path: tcResult.filePath, content: tcResult.newContent }],
            instructionsOnSkip: themeClassInstructions(themeClass),
          });
        }
      }

      // Wire ThemeProvider into the app root.
      const entrySpinner = ora(
        `Locating app entry to wire <ThemeProvider />...`
      ).start();

      if (!entry) {
        entrySpinner.warn(
          framework === "other"
            ? "Skipping ThemeProvider wiring — framework set to 'other'."
            : "Could not auto-detect your app entry file."
        );
        logger.info("");
        logger.info(themeProviderInstructions());
      } else {
        entrySpinner.succeed(`Found entry: ${entry.path}`);

        const currentContent = await fs.readFile(entry.path, "utf8");
        const wireResult = wireThemeProvider(entry, currentContent);

        if (!wireResult.changed) {
          if (wireResult.message) {
            logger.info(wireResult.message);
          }
          logger.info("");
          logger.info(themeProviderInstructions());
        } else {
          const additionalFiles = wireResult.additional ?? [];
          const additionalNote =
            additionalFiles.length > 0
              ? `Will also create: ${additionalFiles
                  .map((f) => f.path)
                  .join(", ")}`
              : undefined;

          await promptAndApply({
            previewHeading: "Proposed change:",
            preview: wireResult.snippetPreview,
            additionalNote,
            target: entry.path,
            applyingLabel: `Wiring <ThemeProvider /> in ${entry.path}...`,
            writes: [
              {
                path: wireResult.primary.path,
                content: wireResult.primary.content,
              },
              ...additionalFiles,
            ],
            instructionsOnSkip: themeProviderInstructions(),
          });
        }
      }
    });

  program.parse();
}

main();
