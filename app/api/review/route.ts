import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "review-link.json");

function getUrl(): string {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")).url ?? "";
  } catch {
    return "";
  }
}

export async function GET() {
  return NextResponse.json({ url: getUrl() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.username !== "admin" || body.password !== "123asd123") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (typeof body.url !== "string") {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify({ url: body.url }));
  return NextResponse.json({ ok: true });
}
