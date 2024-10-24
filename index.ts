#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { styleText } from "node:util";

import resolvePackagePath from "resolve-package-path";
import { satisfies } from "semver";
import { findRoot } from "@manypkg/find-root";

/**
 * TODO: take arguments, maybe a config file
 */
const IGNORE = ["webpack"];
const IGNORE_OVERRIDES = true;

let dir = await findRoot(process.cwd());
let monorepoInfo = await dir.tool.getPackages(dir.rootDir);
let root = monorepoInfo.rootPackage;

const CUSTOM_SETTINGS = (root?.packageJson as any).pnpm;

function readJSONSync(filePath: string) {
  let buffer = readFileSync(filePath);

  return JSON.parse(buffer.toString());
}

class Walker {
  errors: string[] = [];

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
    let dependencies = pkg[section];
    if (!dependencies) {
      return;
    }
    for (let name of Object.keys(dependencies)) {
      let range = dependencies[name];

      // Ignore workspace protocol
      // TODO: but travers its deps
      //       this is part of "monorepo support"
      if (range.startsWith("workspace:")) continue;
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
                  `⚠️ [Override] ${styleText("cyanBright", pkg.name)} asked for ${styleText("cyanBright", name)} ${styleText(
                    "green",
                    range,
                  )} but got an overriden version ${styleText("red", version)}\n  - in ${section} at ${humanPath(packageRoot)}`,
                );
              }
            }
            continue;
          }

          this.errors.push(
            `${styleText("cyanBright", pkg.name)} asked for ${styleText("cyanBright", name)} ${styleText(
              "green",
              range,
            )} but got ${styleText("red", version)}\n  - in ${section} at ${humanPath(packageRoot)}`,
          );
        }
      } else {
        if (IGNORE.includes(name)) continue;

        if (
          section !== "peerDependencies" ||
          !pkg.peerDependenciesMeta?.[name]?.optional
        ) {
          this.errors.push(
            `${styleText("cyanBright", pkg.name)} is missing ${styleText("red", name)}\n  in ${section} at ${humanPath(packageRoot)}`,
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
    process.stdout.write(walker.errors.join("\n") + "\n");
    depHell();
    process.exit(-1);
  }

  greatSuccess(`Your node_modules look good`);
}

function humanPath(path: string) {
  let prefix = process.cwd();
  if (path.startsWith(prefix)) {
    return path.replace(prefix, "$PWD");
  }

  if (root?.dir && path.startsWith(root.dir)) {
    let dotPnpm = join(root.dir, "node_modules/.pnpm");
    if (path.startsWith(dotPnpm)) {
      return path.replace(dotPnpm, "<.pnpm>");
    }

    return path.replace(root.dir, "<root>");
  }

  return path;
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
