import { AgentChat } from "@/app/_components/agent-chat";
import { DemoShell } from "@/app/_components/demo-shell";

export default function NewSessionPage() {
  return (
    <DemoShell>
      <AgentChat sessionless />
    </DemoShell>
  );
}
