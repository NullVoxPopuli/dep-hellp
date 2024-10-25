import { styleText } from "node:util";
import { humanPath } from "./fs.ts";

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

  get humanSourcePath() {
    return humanPath(this.source.path);
  }

  toString() {
    let styledHumanSource = styleText("gray", this.humanSourcePath);
    let section = styleText("italic", this.requested.section);
    if (!this.requested.result) {
      return (
        name(this.source.name) +
        ` is missing ${styleText("red", this.requested.name)}` +
        `\n  in ${section}` +
        ` at ${styledHumanSource}`
      );
    }

    if (this.isOverriden) {
      return (
        `⚠️ [Override] ${name(this.source.name)}` +
        ` asked for ${name(this.requested.name)} ${range(this.requested.range)}` +
        ` but got an overriden version ${wrongVersion(this.requested.result.version)}` +
        `\n  - in ${section} at ${styledHumanSource}`
      );
    }

    return (
      name(this.source.name) +
      ` asked for ${name(this.requested.name)} ${range(this.requested.range)}` +
      ` but got ${wrongVersion(this.requested.result.version)}` +
      `\n  - in ${section} at ${styledHumanSource}`
    );
  }
}
