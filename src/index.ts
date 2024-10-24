#!/usr/bin/env node

import { existsSync } from "node:fs";
import { depHell, greatSuccess, printErrors } from "./log.ts";
import { help } from "./remediation.ts";
import { Walker } from "./walker.ts";

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
    await help(walker);
    return;
  }

  greatSuccess(`Your node_modules look good`);
}

main();
