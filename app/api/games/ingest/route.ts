import { ingestOnce } from "@/lib/ingest-games";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.INGEST_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await ingestOnce();
    return Response.json(result);
  } catch (err) {
    console.error("ingest failed", err);
    return Response.json({ error: "ingest failed", details: String(err) }, { status: 500 });
  }
}
