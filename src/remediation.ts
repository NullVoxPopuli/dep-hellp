import yesno from "yesno";
import { encourage, heh, notice, ohNo } from "./log.ts";
import type { Walker } from "./walker.ts";
import { doIf } from "./shell.ts";
import { root, packageManager } from "./info.ts";

export async function help(walker: Walker) {
  if (!root) {
    ohNo(
      `Could not find a project. How did we get here? You may want to open an issue.`,
    );
    process.exit(-2);
  }

  let userWantsHelp = await yesno({
    question: `Would you like help resolving the above issues? ( y | n )`,
  });

  if (!userWantsHelp) {
    heh("  Good luck");
    process.exit(-1);
  }

  if (!packageManager) {
    notice(
      `There is no packageManager field set in the package.json file at ${root.dir}`,
    );
    encourage(
      `Add a "packageManager" field to the package.json and run dephellp again.`,
    );
    process.exit(-2);
  }

  let [packageManagerTool] = packageManager?.split("@");

  if (!packageManagerTool) {
    ohNo(
      `Looks like the packageManager field is invalid. Make sure that it matches the format "toolName@version". Example: "pnpm@9.12..2"`,
    );
    encourage(
      `Update the  "packageManager" field in the package.json and run dephellp again.`,
    );
    process.exit(-2);
  }

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
      question: `Would you like to install them?`,
      command: `${packageManagerTool} install`,
    });
  }

  notice(`Re-running the dependency scan`);
  await walker.rerun();
}
