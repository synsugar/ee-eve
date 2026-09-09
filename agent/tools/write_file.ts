import { defineTool } from "eve/tools";
import { writeFile } from "eve/tools/write_file";
import {
  isLocalAgentFsEnabled,
  resolveAgentHostPath,
  writeHostAgentFile,
} from "../../lib/agent-fs";
import { sandboxPathToWorkspaceRelative, writeHostWorkspaceFile } from "../../lib/demo-files";

export default defineTool({
  ...writeFile,
  description: [
    "Writes a complete file on the host disk (localhost demo).",
    "Paths under agent/ (agent/agent.ts, agent/instructions.md, agent/tools/foo.ts) write the live agent source. Eve reloads after those writes.",
    "The model is the `model` string in agent/agent.ts (Vercel AI Gateway ids such as google/gemini-3.8-flash). To switch models, write that file.",
    "Any other path (hello.md, /workspace/hello.md, notes/todo.md) writes host workspace/, which is the same tree shown in the demo pane.",
    "Do not overwrite agent/tools/write_file.ts, agent/tools/read_file.ts, or agent/tools/bash.ts.",
  ].join("\n"),
  async execute(input, ctx) {
    if (!isLocalAgentFsEnabled()) {
      return writeFile.execute(input, ctx);
    }
    const agentPath = resolveAgentHostPath(input.filePath);
    if (agentPath !== null) {
      return writeHostAgentFile(agentPath, input.content);
    }
    const relativePath = sandboxPathToWorkspaceRelative(input.filePath);
    if (relativePath === null) {
      throw new Error("write_file is limited to agent/ and workspace/ on this localhost demo.");
    }
    return writeHostWorkspaceFile(relativePath, input.content);
  },
});
