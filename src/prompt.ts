import { intro, confirm, isCancel } from "@clack/prompts";

export async function askOrBail(question: string, onBail: () => void) {
  let result = await confirm({ message: question });

  if (!result || isCancel(result)) {
    onBail();
    process.exit(-1);
  }
}

const divider = `----------------------`;

export function showIntro() {
  intro(divider + "\n" + "    dep hellp" + "\n" + "   " + divider);
}
