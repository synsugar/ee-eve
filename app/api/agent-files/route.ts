import { NextResponse } from "next/server";
import { isLocalAgentFsEnabled } from "@/lib/agent-fs";
import { listDemoFiles, readDemoFile, writeDemoFile } from "@/lib/demo-files";

function disabled() {
  return NextResponse.json({ error: "Agent file APIs are localhost-only." }, { status: 404 });
}

export async function GET(request: Request) {
  if (!isLocalAgentFsEnabled()) {
    return disabled();
  }

  const url = new URL(request.url);
  const relativePath = url.searchParams.get("path");

  try {
    if (relativePath === null || relativePath.length === 0) {
      return NextResponse.json({ files: await listDemoFiles() });
    }
    const content = await readDemoFile(relativePath);
    return NextResponse.json({ path: relativePath, content });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to read agent files." },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  if (!isLocalAgentFsEnabled()) {
    return disabled();
  }

  try {
    const body = (await request.json()) as { path?: unknown; content?: unknown };
    if (typeof body.path !== "string" || typeof body.content !== "string") {
      return NextResponse.json({ error: "Expected { path, content }." }, { status: 400 });
    }
    await writeDemoFile(body.path, body.content);
    return NextResponse.json({ path: body.path });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to write agent file." },
      { status: 400 },
    );
  }
}
