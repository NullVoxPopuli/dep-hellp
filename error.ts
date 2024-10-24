import { styleText } from "node:util";
import { join } from "node:path";
import { root } from "./info.ts";

interface DependencySource {
  name: string;
  version: string;
  path: string;
}

interface DependencyRequest {
  name: string;
  range: string;
  section: "devDependencies" | "dependencies" | "peerDependencies";
  overrideVersion?: string;
  result?: {
    version: string;
    resolvedPath: string;
  };
}

function name(str: string) {
  return styleText("cyanBright", str);
}

function wrongVersion(str: string) {
  return styleText("red", str);
}

function range(str: string) {
  return styleText("green", str);
}

export class DependencyError {
  source: DependencySource;
  requested: DependencyRequest;

  constructor(source: DependencySource, requested: DependencyRequest) {
    this.source = source;
    this.requested = requested;
  }

  get isOverriden() {
    return Boolean(this.requested.overrideVersion);
  }

  toString() {
    if (!this.requested.result) {
      return (
        name(this.source.name) +
        ` is missing ${styleText("red", this.requested.name)}` +
        `\n  in ${this.requested.section}` +
        ` at ${humanPath(this.source.path)}`
      );
    }

    if (this.isOverriden) {
      return (
        `⚠️ [Override] ${name(this.source.name)}` +
        ` asked for ${name(this.requested.name)} ${range(this.requested.range)}` +
        ` but got an overriden version ${wrongVersion(this.requested.result.version)}` +
        `\n  - in ${this.requested.section} at ${humanPath(this.source.path)}`
      );
    }

    return (
      name(this.source.name) +
      ` asked for ${name(this.requested.name)} ${range(this.requested.range)}` +
      ` but got ${wrongVersion(this.requested.result.version)}` +
      `\n  - in ${this.requested.section} at ${humanPath(this.source.path)}`
    );
  }
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
