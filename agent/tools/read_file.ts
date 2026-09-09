import { defineTool } from "eve/tools";
import { readFile } from "eve/tools/read_file";
import {
  isLocalAgentFsEnabled,
  readHostAgentFile,
  resolveAgentHostPath,
} from "../../lib/agent-fs";
import { readHostWorkspaceFile, sandboxPathToWorkspaceRelative } from "../../lib/demo-files";

export default defineTool({
  ...readFile,
  description: [
    "Reads a text file with line numbers from the host disk (localhost demo).",
    "Paths under agent/ read the live agent source. Any other path reads host workspace/, the same files shown and edited in the demo pane.",
  ].join("\n"),
  async execute(input, ctx) {
    if (!isLocalAgentFsEnabled()) {
      return readFile.execute(input, ctx);
    }
    const agentPath = resolveAgentHostPath(input.filePath);
    if (agentPath !== null) {
      return readHostAgentFile(agentPath, input.offset, input.limit);
    }
    const relativePath = sandboxPathToWorkspaceRelative(input.filePath);
    if (relativePath === null) {
      throw new Error("read_file is limited to agent/ and workspace/ on this localhost demo.");
    }
    return readHostWorkspaceFile(relativePath, input.offset, input.limit);
  },
});
