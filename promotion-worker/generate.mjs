import { randomBytes, createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const count = Number(process.argv[2]);
const directory = process.argv[3];
if (!Number.isInteger(count) || count < 1 || count > 1000 || !directory) {
  throw new Error("Usage: node promotion-worker/generate.mjs COUNT PRIVATE_OUTPUT_DIRECTORY");
}
const codes = Array.from({ length: count }, () => randomBytes(24).toString("base64url"));
const sql = codes.map((code) => `INSERT INTO codes (code_hash) VALUES ('${createHash("sha256").update(code).digest("hex")}');`).join("\n");
const output = resolve(directory);
await mkdir(output, { recursive: true, mode: 0o700 });
await writeFile(resolve(output, "codes.txt"), `${codes.join("\n")}\n`, { flag: "wx", mode: 0o600 });
await writeFile(resolve(output, "codes.sql"), `${sql}\n`, { flag: "wx", mode: 0o600 });
console.log(`Created ${count} codes and SQL in ${output}`);
