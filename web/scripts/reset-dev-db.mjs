import { rm } from "node:fs/promises";
import path from "node:path";

const file = path.join(process.cwd(), ".data", "dev-db.json");

try {
  await rm(file);
  console.log(`Removed ${file}`);
} catch (error) {
  if (error?.code === "ENOENT") {
    console.log("No local development data store to reset.");
  } else {
    throw error;
  }
}
