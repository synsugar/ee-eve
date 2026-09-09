import { watch } from "node:fs";
import { getAgentRoot, isLocalAgentFsEnabled } from "@/lib/agent-fs";
import { ensureWorkspaceRoot } from "@/lib/demo-files";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isLocalAgentFsEnabled()) {
    return new Response("Not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const { signal } = request;
  const workspaceRoot = await ensureWorkspaceRoot();

  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "change" })}\n\n`));
      };

      send();
      const watchers = [
        watch(getAgentRoot(), { recursive: true }, send),
        watch(workspaceRoot, { recursive: true }, send),
      ];
      const ping = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15_000);

      const close = () => {
        for (const watcher of watchers) {
          watcher.close();
        }
        clearInterval(ping);
        controller.close();
      };

      signal.addEventListener("abort", close, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}
