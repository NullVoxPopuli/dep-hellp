import { styleText } from "node:util";
import { confirm, isCancel } from "@clack/prompts";
import { heh, notice } from "./log.ts";
import { $ } from "execa";

export async function doIf({
  question,
  command,
}: {
  question: string;
  command: string;
}) {
  notice(`I want to run\n\n\t${styleText("blueBright", command)}\n`);

  let result = await confirm({
    message: question,
  });

  if (result && !isCancel(result)) {
    await $({ shell: true, stdio: "inherit" })(command);
    return;
  }

  heh("Very well");
}
