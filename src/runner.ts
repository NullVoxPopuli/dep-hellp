import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  depHell,
  greatSuccess,
  heading,
  ohNo,
  printErrors,
  yay,
} from "./log.ts";
import { help } from "./remediation.ts";
import { Walker } from "./walker.ts";
import { monorepoPackages, root } from "./info.ts";
import { styleText } from "node:util";
import type { Package } from "@manypkg/get-packages";
import { humanPath } from "./fs.ts";

export class Runner {
  constructor() {
    if (!existsSync("package.json")) {
      ohNo(`You must run this command in a project with a package.json file.`);

      process.exit(-1);
    }
  }

  #lastRun = new Map<Package, Walker>();

  async run() {
    this.#lastRun = new Map<Package, Walker>();

    /**
     * monorepoPackages only includes the root package
     * if the repo is a non-monorepo.
     */
    if (monorepoPackages.length > 1) {
      await this.#runMonorepo();

      return;
    }

    await this.#runSingle();
  }

  get errors() {
    let result = [];
    for (let [, walker] of this.#lastRun.entries()) {
      result.push(...walker.errors);
    }
    return result;
  }

  printErrors() {
    for (let [pkg, walker] of this.#lastRun.entries()) {
      if (walker.errors.length) {
        heading(fullPackageName(pkg));
        printErrors(walker);
      }
    }
  }

  async #runSingle() {
    let walker = new Walker();

    this.#lastRun.set(root, walker);

    walker.traverse("package.json", true);

    this.printErrors();
    if (walker.errors.length > 0) {
      depHell();
      await help(this);
      return;
    }

    greatSuccess(`Your node_modules look good`);
  }

  async #runMonorepo() {
    let totalErrors = 0;

    for (let pkg of [root, ...monorepoPackages]) {
      let walker = new Walker();

      this.#lastRun.set(pkg, walker);

      let manifestPath = join(pkg.dir, "package.json");
      console.log(`Scanning ${fullPackageName(pkg)}`);
      walker.traverse(manifestPath, true);

      if (walker.errors.length) {
        totalErrors += walker.errors.length;
        ohNo(`  Found ${walker.errors.length} errors`);
      } else {
        yay(`  All good`);
      }
      console.info("");
    }

    let hasErrors = totalErrors > 0;

    if (hasErrors) {
      ohNo(`
        There are ${totalErrors} total errors.
      `);
    }

    this.printErrors();

    if (hasErrors) {
      depHell();
      await help(this);
      return;
    }
    greatSuccess(`Your node_modules look good`);
  }
}

function fullPackageName(pkg: Package) {
  let name = styleText("cyanBright", pkg.packageJson.name ?? "<name not set>");
  let dir = styleText("gray", humanPath(pkg.dir));

  return `${name} at ${dir}`;
}
