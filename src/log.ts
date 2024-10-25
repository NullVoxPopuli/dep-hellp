import { styleText } from "node:util";
import type { Walker } from "./walker.ts";

export function printErrors(walker: Walker) {
  console.error(walker.errors.join("\n") + "\n");
}

export function heh(msg: string) {
  console.info(styleText("italic", `\n${msg}\n`));
}

export function notice(msg: string) {
  console.info(`
      ${msg}
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
export function yay(msg: string) {
  console.info(styleText("green", msg));
}

export function depHell() {
  console.error(`
  🔥🔥🔥

  ${styleText("red", "You are in dependency hell")}

  🔥🔥🔥
`);
}
