import { defineTool } from "eve/tools";
import { bash } from "eve/tools/bash";
import { isLocalAgentFsEnabled } from "../../lib/agent-fs";
import { runHostWorkspaceBash } from "../../lib/demo-files";

export default defineTool({
  ...bash,
  description: [
    "Run a bash command on the host (localhost demo).",
    "The working directory is workspace/, the same folder shown in the demo pane. File redirects and edits persist on disk.",
    "Use write_file for agent/ source files.",
  ].join("\n"),
  async execute(input, ctx) {
    if (!isLocalAgentFsEnabled()) {
      return bash.execute(input, ctx);
    }
    return runHostWorkspaceBash(input.command);
  },
});
