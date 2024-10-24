import { styleText } from "node:util";
import type { Walker } from "./walker.ts";

export function printErrors(walker: Walker) {
  process.stdout.write(walker.errors.join("\n") + "\n");
}

export function heh(msg: string) {
  console.info(styleText("italic", `\n${msg}\n`));
}

export function notice(msg: string) {
  console.info(`
    ℹ️  ${msg}
  `);
}

export function greatSuccess(msg: string) {
  console.info(`
  ✨✨✨

  ${msg}

  ✨✨✨
`);
}

export function encourage(msg: string) {
  console.info(`
    ${msg}
    
    You got this 💪
  `);
}

export function ohNo(error: string) {
  console.error(styleText("red", error));
}

export function depHell() {
  console.error(`
  🔥🔥🔥

  ${styleText("red", "You are in dependency hell")}

  🔥🔥🔥
`);
}
