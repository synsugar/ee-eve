"use client";

import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useMemo, useState } from "react";

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "13px",
    fontFamily: "inherit",
  },
  "&.cm-editor": {
    height: "100%",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "inherit",
  },
  ".cm-content": {
    fontFamily: "inherit",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
  },
  ".cm-gutters svg": {
    display: "inline-block",
    verticalAlign: "middle",
  },
});

export function HighlightedEditor({
  value,
  path,
  onChange,
}: {
  readonly value: string;
  readonly path?: string;
  readonly onChange: (value: string) => void;
}) {
  const [dark, setDark] = useState(false);
  const extensions = useMemo(() => {
    const language = languageExtension(path);
    return language === undefined ? [editorTheme] : [language, editorTheme];
  }, [path]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setDark(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-hidden font-mono text-[13px] leading-5">
      <CodeMirror
        basicSetup={{
          foldGutter: false,
          highlightActiveLine: true,
          lineNumbers: true,
        }}
        className="h-full text-[13px]"
        extensions={extensions}
        height="100%"
        key={path ?? "none"}
        onChange={onChange}
        theme={dark ? "dark" : "light"}
        value={value}
      />
    </div>
  );
}

function languageExtension(path?: string): Extension | undefined {
  if (path === undefined) {
    return undefined;
  }
  if (path.endsWith(".ts") || path.endsWith(".tsx") || path.endsWith(".js") || path.endsWith(".jsx")) {
    return javascript({ jsx: true, typescript: true });
  }
  if (path.endsWith(".md") || path.endsWith(".mdx")) {
    return markdown();
  }
  if (path.endsWith(".json")) {
    return json();
  }
  if (path.endsWith(".css")) {
    return css();
  }
  return undefined;
}
