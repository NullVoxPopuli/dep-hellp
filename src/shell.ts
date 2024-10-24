import yesno from "yesno";
import { heh, notice } from "./log.ts";
import { $ } from "execa";

export async function doIf({
  question,
  command,
}: {
  question: string;
  command: string;
}) {
  notice(`
  I want to run:
    ${command}
  `);
  let result = await yesno({
    question: `${question} ( y | n )`,
  });

  if (result) {
    await $({ shell: true })(command);
  }

  heh("Very well");
}
