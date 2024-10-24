import { findRoot } from "@manypkg/find-root";

const dir = await findRoot(process.cwd());
const monorepoInfo = await dir.tool.getPackages(dir.rootDir);

export const root = monorepoInfo.rootPackage;
export const CUSTOM_SETTINGS = (root?.packageJson as any).pnpm;
