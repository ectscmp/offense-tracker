import { existsSync } from "node:fs";
import { MongoClient } from "mongodb";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB?.trim() || "offense_tracker";

if (!uri) {
  console.error("MONGODB_URI is not set. Add it to web/.env.local or the environment.");
  process.exit(1);
}

if (!process.argv.includes("--yes")) {
  console.error(`This drops the "${dbName}" database. Re-run with: npm run db:reset -- --yes`);
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

try {
  await client.connect();
  await client.db(dbName).dropDatabase();
  console.log(`Dropped database "${dbName}". The next sign-in recreates the teacher defaults.`);
} finally {
  await client.close();
}
