import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const nextCachePath = resolve(".next");

await rm(nextCachePath, { force: true, recursive: true });

console.info(`Cleared ${nextCachePath}`);
