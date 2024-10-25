import { join } from "node:path";
import { select } from "@clack/prompts";
import latestVersion from "latest-version";

import { readJSONSync, writeJSONSync } from "../fs.ts";
import { root } from "../info.ts";
import { encourage, notice, ohNo } from "../log.ts";
import { askOrBail } from "../prompt.ts";

export async function ensurePackageManagerField(): Promise<{
  packageManager: string;
  version: string;
}> {
  let manifestPath = join(root.dir, "package.json");
  let manifest = readJSONSync(manifestPath);
  let packageManagerField = manifest.packageManager;

  if (!packageManagerField) {
    notice(
      `There is no packageManager field set in the package.json file at ${root.dir}`,
    );

    await askOrBail(`Would you like to choose a package manager now?`, () => {
      encourage(
        `Add a "packageManager" field to the package.json and run dephellp again.`,
      );
      process.exit(-1);
    });

    packageManagerField = await choosePackageManager(manifestPath, manifest);
  }

  let [packageManager, version] = packageManagerField?.split("@");

  if (!packageManager || !version) {
    ohNo(
      `Looks like the packageManager field is invalid. Make sure that it matches the format "toolName@version". Example: "pnpm@9.12..2"`,
    );

    await askOrBail(
      `Would you like to (re) choose a package manager now?`,
      () => {
        encourage(
          `Update the  "packageManager" field in the package.json and run dephellp again.`,
        );
        process.exit(-1);
      },
    );

    packageManagerField = await choosePackageManager(manifestPath, manifest);

    [packageManager, version] = packageManagerField.split("@");
  }

  return { packageManager, version };
}

async function choosePackageManager(manifestPath: string, manifest: any) {
  let [pnpm, npm, yarn] = await Promise.all([
    latestVersion("pnpm"),
    latestVersion("npm"),
    latestVersion("yarn"),
  ]);
  let versions = { pnpm, npm, yarn };

  let packageManager = await select({
    message: "Select a package manager",
    options: [
      { value: "pnpm", label: "pnpm", hint: pnpm },
      { value: "npm", label: "npm", hint: npm },
      { value: "yarn", label: "yarn", hint: yarn },
    ],
  });

  let selectedVersion = versions[packageManager as "pnpm" | "npm" | "yarn"];

  let packageManagerField =
    (manifest.packageManager = `${packageManager}@${selectedVersion}`);

  writeJSONSync(manifestPath, manifest);

  return packageManagerField;
}
