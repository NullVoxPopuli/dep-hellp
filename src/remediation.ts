import { depHell, greatSuccess, heh, notice, printErrors } from "./log.ts";
import type { Walker } from "./walker.ts";
import { doIf } from "./shell.ts";
import { ensurePackageManagerField } from "./tasks/add-package-manager-field.ts";
import { askOrBail, showIntro } from "./prompt.ts";

export async function help(walker: Walker) {
  showIntro();

  await askOrBail(`Would you like help resolving the above issues?`, () =>
    heh("  Good luck"),
  );

  let { packageManager } = await ensurePackageManagerField();

  let errors = walker.errors;
  /**
   * First, do any of our errors have missing deps from "."
   * (our current directory)
   *
   * If so, maybe we forgot to run dependency install.
   */
  let directMissisng = errors.filter((error) => error.humanSourcePath === ".");

  if (directMissisng.length > 0) {
    notice(`It looks like your current directory is missing dependencies.`);

    await doIf({
      question: `Would you like to install dependencies?`,
      command: `${packageManager} install`,
    });
  }

  await areWeDoneYet(walker);

  /**
   * Oh no, we we couldn't do it.
   */
  if (walker.errors.length) {
    printErrors(walker);
    depHell();
    heh("You're on your own");
    process.exit(1);
  }
}

async function areWeDoneYet(walker: Walker) {
  notice(`Re-running the dependency scan`);
  await walker.rerun();

  if (walker.errors.length === 0) {
    greatSuccess(`You did it! Your node_modules look great!`);
    process.exit(0);
  }
}
