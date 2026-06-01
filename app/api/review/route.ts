import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const URL_FILE = path.join(process.cwd(), "app/review/url.ts");
const OWNER = "semseiizsak";
const REPO = "photobooth_app";
const GH_PATH = "app/review/url.ts";

function makeFileContent(url: string) {
  return `export const REVIEW_URL = ${JSON.stringify(url)};\n`;
}

function readLocal(): string {
  try {
    const src = fs.readFileSync(URL_FILE, "utf8");
    const m = src.match(/REVIEW_URL = "([^"]*)"/);
    return m?.[1] ?? "";
  } catch {
    return "";
  }
}

async function readGitHub(token: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${GH_PATH}`,
    { headers: { Authorization: `token ${token}` }, cache: "no-store" }
  );
  if (!res.ok) return readLocal();
  const data = await res.json();
  const src = Buffer.from(data.content, "base64").toString("utf8");
  const m = src.match(/REVIEW_URL = "([^"]*)"/);
  return m?.[1] ?? "";
}

async function writeGitHub(token: string, url: string): Promise<void> {
  const getRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${GH_PATH}`,
    { headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" } }
  );
  const getData = await getRes.json();

  await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${GH_PATH}`,
    {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "update review URL",
        content: Buffer.from(makeFileContent(url)).toString("base64"),
        sha: getData.sha,
      }),
    }
  );
}

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const url = token ? await readGitHub(token) : readLocal();
  return NextResponse.json({ url });
}

export async function POST(req: NextRequest) {
  const { username, password, url } = await req.json();

  if (username !== "admin" || password !== "123asd123") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.GITHUB_TOKEN;

  if (token) {
    await writeGitHub(token, url);
    return NextResponse.json({ ok: true, deploying: true });
  }

  // local dev fallback
  try {
    fs.writeFileSync(URL_FILE, makeFileContent(url));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Add GITHUB_TOKEN env var in Vercel to enable saving." },
      { status: 500 }
    );
  }
}
