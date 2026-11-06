import { pingDatabase } from "@/lib/store";

// Railway (and any other platform) can hit this to verify the app and database.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pingDatabase();
    return Response.json({ ok: true, database: "up" });
  } catch (error) {
    console.error("Health check failed:", error);
    return Response.json({ ok: false, database: "down" }, { status: 503 });
  }
}
