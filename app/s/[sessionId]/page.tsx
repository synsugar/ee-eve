import { AgentChat } from "@/app/_components/agent-chat";
import { DemoShell } from "@/app/_components/demo-shell";

export default async function SessionPage({
  params,
}: {
  readonly params: Promise<{ readonly sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <DemoShell>
      <AgentChat sessionId={sessionId} />
    </DemoShell>
  );
}
