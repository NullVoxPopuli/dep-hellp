import assert from "node:assert";
import { findRoot } from "@manypkg/find-root";
import { satisfies } from "semver";

const dir = await findRoot(process.cwd());
const monorepoInfo = await dir.tool.getPackages(dir.rootDir);

export const root = monorepoInfo.rootPackage!;

assert(
  root,
  `Could not find root directory with a package.json. Make sure that you are in a project that has a package.json file.`,
);

export const monorepoPackages = monorepoInfo.packages;
export const packageManager = (root?.packageJson as any)?.packageManager;

/**
 * Overrides / Resolutions
 *
 * <root>package.json#
 *   overrides
 *   resolutions
 *   pnpm.overrides
 *
 * We don't yet support per-package overrides,
 * because packageManagers barely do
 */
const rootManifest = root.packageJson as any;

export const overrides =
  rootManifest.pnpm?.overrides ??
  rootManifest.overrides ??
  rootManifest.resolutions ??
  {};

export function satisfiesOverride(name: string, version: string) {
  let overriddenVersion = overrides[name];

  if (!overriddenVersion) return false;

  return satisfies(version, overriddenVersion, { includePrerelease: true });
}

export function overrideFor(name: string) {
  let overriddenVersion = overrides[name];

  if (!overriddenVersion) return false;

  return overriddenVersion;
}
