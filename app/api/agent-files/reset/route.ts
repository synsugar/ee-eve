import { NextResponse } from "next/server";
import { isLocalAgentFsEnabled, resetAgentToGitHead } from "@/lib/agent-fs";
import { resetWorkspace } from "@/lib/demo-files";

export async function POST() {
  if (!isLocalAgentFsEnabled()) {
    return NextResponse.json({ error: "Agent file APIs are localhost-only." }, { status: 404 });
  }

  try {
    await resetAgentToGitHead();
    await resetWorkspace();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to reset agent files." },
      { status: 500 },
    );
  }
}
