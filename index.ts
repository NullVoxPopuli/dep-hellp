#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { styleText } from "node:util";

import resolvePackagePath from "resolve-package-path";
import { satisfies } from "semver";

import { DependencyError } from "./error.ts";
import { CUSTOM_SETTINGS } from "./info.ts";

/**
 * TODO: take arguments, maybe a config file
 */
const IGNORE = ["webpack"];
const IGNORE_OVERRIDES = true;

function readJSONSync(filePath: string) {
  let buffer = readFileSync(filePath);

  return JSON.parse(buffer.toString());
}

class Walker {
  errors: DependencyError[] = [];

  private seen: Map<string, string> = new Map();

  traverse(packageJSONPath: string, checkDevDependencies = false): string {
    let version = this.seen.get(packageJSONPath);
    if (version) {
      return version;
    }

    let pkg = readJSONSync(packageJSONPath);
    this.seen.set(packageJSONPath, pkg.version);

    let root = dirname(packageJSONPath);

    this.checkSection("dependencies", pkg, root);
    this.checkSection("peerDependencies", pkg, root);

    if (checkDevDependencies) {
      this.checkSection("devDependencies", pkg, root);
    }

    return pkg.version;
  }

  private checkSection(
    section: "dependencies" | "devDependencies" | "peerDependencies",
    pkg: any,
    packageRoot: string,
  ): void {
    let source = {
      name: pkg.name,
      version: pkg.version,
      path: packageRoot,
    };

    let dependencies = pkg[section];
    if (!dependencies) {
      return;
    }
    for (let name of Object.keys(dependencies)) {
      let range = dependencies[name];

      if (range.startsWith("workspace:")) {
        this.checkDep(packageRoot, name);
        continue;
      }
      // For package-aliases (due to bad-actors, etc)
      if (range.startsWith("npm:") && range.includes("@")) {
        let [, rangeOverride] = range.split("@");
        range = rangeOverride;
      }

      let version = this.checkDep(packageRoot, name);

      if (version) {
        if (!satisfies(version, range, { includePrerelease: true })) {
          let override = CUSTOM_SETTINGS?.overrides?.[name];

          if (override) {
            if (!satisfies(override, range, { includePrerelease: true })) {
              if (!IGNORE_OVERRIDES) {
                this.errors.push(
                  new DependencyError(source, {
                    name,
                    range,
                    section,
                    overrideVersion: override,
                    result: {
                      version,
                      resolvedPath: "todo",
                    },
                  }),
                );
              }
            }
            continue;
          }

          this.errors.push(
            new DependencyError(source, {
              name,
              range,
              section,
              result: { version, resolvedPath: "todo" },
            }),
          );
        }
      } else {
        if (IGNORE.includes(name)) continue;

        if (
          section !== "peerDependencies" ||
          !pkg.peerDependenciesMeta?.[name]?.optional
        ) {
          this.errors.push(
            new DependencyError(source, {
              name,
              range,
              section,
            }),
          );
        }
      }
    }
  }

  private checkDep(packageRoot: string, pkgName: string): string | false {
    let target = resolvePackagePath(pkgName, packageRoot);
    if (!target) {
      return false;
    }
    return this.traverse(target);
  }
}

async function main() {
  if (!existsSync("package.json")) {
    process.stderr.write(
      `You must run this command in a project with a package.json file.`,
    );
    process.exit(-1);
  }
  let walker = new Walker();

  walker.traverse("package.json", true);

  if (walker.errors.length > 0) {
    printErrors(walker);
    depHell();
    process.exit(-1);
  }

  greatSuccess(`Your node_modules look good`);
}

function printErrors(walker: Walker) {
  process.stdout.write(walker.errors.join("\n") + "\n");
}

function greatSuccess(msg: string) {
  console.info(`
  ✨✨✨

  ${msg}

  ✨✨✨
`);
}

function depHell() {
  console.error(`
  🔥🔥🔥

  ${styleText("red", "You are in dependency hell")}

  🔥🔥🔥
`);
}

main();
