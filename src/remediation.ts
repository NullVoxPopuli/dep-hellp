import { depHell, greatSuccess, heh, notice } from "./log.ts";
import { doIf } from "./shell.ts";
import { ensurePackageManagerField } from "./tasks/add-package-manager-field.ts";
import { askOrBail, showIntro } from "./prompt.ts";
import { Runner } from "./runner.ts";

export async function help(runner: Runner) {
  showIntro();

  await askOrBail(`Would you like help resolving the above issues?`, () =>
    heh("  Good luck"),
  );

  let { packageManager } = await ensurePackageManagerField();

  let errors = runner.errors;
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

  await areWeDoneYet(runner);

  /**
   * Oh no, we we couldn't do it.
   */
  if (runner.errors.length) {
    runner.printErrors();
    depHell();
    heh("You're on your own");
    process.exit(1);
  }
}

async function areWeDoneYet(runner: Runner) {
  notice(`Re-running the dependency scan`);
  await runner.run();

  if (runner.errors.length === 0) {
    greatSuccess(`You did it! Your node_modules look great!`);
    process.exit(0);
  }
}
