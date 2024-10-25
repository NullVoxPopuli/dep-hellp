import assert from "node:assert";
import { findRoot } from "@manypkg/find-root";

const dir = await findRoot(process.cwd());
const monorepoInfo = await dir.tool.getPackages(dir.rootDir);

export const root = monorepoInfo.rootPackage!;

assert(
  root,
  `Could not find root directory with a package.json. Make sure that you are in a project that has a package.json file.`,
);

export const monorepoPackages = monorepoInfo.packages;
export const CUSTOM_SETTINGS = (root?.packageJson as any).pnpm;
export const packageManager = (root?.packageJson as any)?.packageManager;
