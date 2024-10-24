import { dirname } from "node:path";
import { readFileSync } from "node:fs";

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

export class Walker {
  errors: DependencyError[] = [];

  private seen: Map<string, string> = new Map();

  async rerun() {
    this.seen.clear();
    this.traverse("package.json", true);
  }

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

      // TODO: is there anything we can do about this?
      if (range.startsWith("github:")) {
        continue;
      }

      // TODO: find this directory and keep traversing
      if (range.startsWith("link:")) {
        continue;
      }

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
