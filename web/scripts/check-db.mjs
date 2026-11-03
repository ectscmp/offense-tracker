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

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

try {
  await client.connect();
  const db = client.db(dbName);
  await db.command({ ping: 1 });
  console.log(`Connected to MongoDB database "${dbName}".`);

  const collections = (await db.listCollections().toArray()).map((entry) => entry.name).sort();
  if (!collections.length) {
    console.log("No collections yet. Sign in once to create the teacher and default behaviors.");
  } else {
    for (const name of collections) {
      const count = await db.collection(name).countDocuments();
      console.log(`  ${name}: ${count}`);
    }
  }
} finally {
  await client.close();
}
