import type { ReactNode } from "react";
import { AgentFilesPanel } from "./agent-files-panel";

export function DemoShell({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex h-dvh min-h-0 bg-background">
      <div className="hidden h-full min-w-0 flex-1 md:block">
        <AgentFilesPanel />
      </div>
      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}
