import { writeFileSync, readFileSync } from "node:fs";

export function readJSONSync(filePath: string) {
  let buffer = readFileSync(filePath);

  return JSON.parse(buffer.toString());
}

export function writeJSONSync(filePath: string, data: any) {
  let str = JSON.stringify(data, null, 2);

  writeFileSync(filePath, str);
}
