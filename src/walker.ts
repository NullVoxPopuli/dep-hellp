import { dirname } from "node:path";

import resolvePackagePath from "resolve-package-path";
import { satisfies } from "semver";

import { DependencyError } from "./error.ts";
import { overrideFor, satisfiesOverride } from "./info.ts";
import { readJSONSync } from "./fs.ts";

/**
 * TODO: take arguments, maybe a config file
 * TODO: have a way to expose what this default list is
 */
const IGNORE = [
  "webpack",
  "@pnpm/config",
  "@pnpm/default-reporter",
  "ramda",
  // Chronically incorrect
  "aws-sdk",
  // Ancient dependencies
  "router_js",
  "rsvp",
  "fast-glob",
  "url",
  "ember-cli",
  "markdown-it",
  "node-fetch",
  "whatwg-url",
  "ansi-html",
  "broccoli-middleware",
  "broccoli",
];
const IGNORE_OVERRIDES = true;

export class Walker {
  errors: DependencyError[] = [];

  private packageResolveCache = {
    PATH: new Map(),
    RESOLVED_PACKAGE_PATH: new Map(),
    REAL_FILE_PATH: new Map(),
    REAL_DIRECTORY_PATH: new Map(),
  };
  private seen = new Map<string, string>();

  async rerun() {
    this.packageResolveCache.PATH.clear();
    this.packageResolveCache.REAL_FILE_PATH.clear();
    this.packageResolveCache.REAL_DIRECTORY_PATH.clear();
    this.packageResolveCache.REAL_FILE_PATH.clear();
    this.seen.clear();
    this.errors = [];
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

      // TODO: download this, and compare with what's on disk
      if (range.startsWith("https:")) {
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
          let override = overrideFor(name);

          if (override) {
            if (!satisfiesOverride(name, version)) {
              if (!IGNORE_OVERRIDES) {
                if (IGNORE.includes(name)) continue;
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

          if (IGNORE.includes(name)) continue;
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
    let target = resolvePackagePath(
      pkgName,
      packageRoot,
      this.packageResolveCache,
    );
    if (!target) {
      return false;
    }
    return this.traverse(target);
  }
}
