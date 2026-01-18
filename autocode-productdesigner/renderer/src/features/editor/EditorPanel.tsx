import { memo, useCallback, useEffect } from "react";
import type { Tab } from "@autocode/types";

interface EditorPanelProps {
  tab: Tab | null;
  onTabChange: (content: string) => void;
  workspace: string;
  autosaveEnabled: boolean;
  onToggleAutosave: (enabled: boolean) => void;
  indentation: 2 | 4 | 8;
  onIndentationChange: (indent: 2 | 4 | 8) => void;
  wordWrap: boolean;
  onWordWrapChange: (wrap: boolean) => void;
}

export const EditorPanel = memo(function EditorPanel({
  tab,
  onTabChange,
  workspace,
  autosaveEnabled,
  onToggleAutosave,
  indentation,
  onIndentationChange,
  wordWrap,
  onWordWrapChange
}: EditorPanelProps) {
  if (!tab) {
    return (
      <div className="flex h-full items-center justify-center text-zed-text-muted text-sm">
        No file open
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <EditorToolbar
        fileName={tab.file.name}
        autosaveEnabled={autosaveEnabled}
        onToggleAutosave={onToggleAutosave}
        indentation={indentation}
        onIndentationChange={onIndentationChange}
        wordWrap={wordWrap}
        onWordWrapChange={onWordWrapChange}
      />
      <div className="flex-1 overflow-hidden">
        <CodeEditor
          tab={tab}
          onChange={onTabChange}
          indentation={indentation}
          wordWrap={wordWrap}
        />
      </div>
    </div>
  );
});

interface EditorToolbarProps {
  fileName: string;
  autosaveEnabled: boolean;
  onToggleAutosave: (enabled: boolean) => void;
  indentation: 2 | 4 | 8;
  onIndentationChange: (indent: 2 | 4 | 8) => void;
  wordWrap: boolean;
  onWordWrapChange: (wrap: boolean) => void;
}

const EditorToolbar = memo(function EditorToolbar({
  fileName,
  autosaveEnabled,
  onToggleAutosave,
  indentation,
  onIndentationChange,
  wordWrap,
  onWordWrapChange
}: EditorToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b border-zed-border bg-zed-surface px-4 py-1 text-xs">
      <span className="text-zed-text-muted">{fileName}</span>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1 text-zed-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={autosaveEnabled}
            onChange={(e) => onToggleAutosave(e.target.checked)}
            className="rounded border-zed-border"
          />
          Auto-save
        </label>
        <select
          value={indentation}
          onChange={(e) => onIndentationChange(Number(e.target.value) as 2 | 4 | 8)}
          className="rounded border border-zed-border bg-zed-element px-2 py-0.5 text-zed-text"
        >
          <option value={2}>2 spaces</option>
          <option value={4}>4 spaces</option>
          <option value={8}>8 spaces</option>
        </select>
        <label className="flex items-center gap-1 text-zed-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={wordWrap}
            onChange={(e) => onWordWrapChange(e.target.checked)}
            className="rounded border-zed-border"
          />
          Wrap
        </label>
      </div>
    </div>
  );
});

interface CodeEditorProps {
  tab: Tab;
  onChange: (content: string) => void;
  indentation: 2 | 4 | 8;
  wordWrap: boolean;
}

const CodeEditor = memo(function CodeEditor({
  tab,
  onChange,
  indentation,
  wordWrap
}: CodeEditorProps) {
  useEffect(() => {
    import("@uiw/react-codemirror").then(async ({ default: CodeMirror }) => {
      const extensions = await import("@codemirror/language-data");
      const { languages } = await import("@codemirror/language-data");
      const langExtension = await import("@codemirror/language");
      const autocompletion = await import("@codemirror/autocomplete");
      const search = await import("@codemirror/search");
      const history = await import("@codemirror/commands");

      const ext = tab.file.name.split('.').pop() || '';
      const langDescription = languages.find((l: { extensions: string[] }) =>
        l.extensions.includes(`.${ext}`)
      );

      let lang = [];
      if (langDescription) {
        const loadLang = await langDescription.load();
        lang = [loadLang];
      }

      const container = document.getElementById(`editor-${tab.id}`);
      if (container && !container.querySelector('.cm-editor')) {
        const extensions = [
          lang,
          autocompletion.autocompletion(),
          history.history(),
          search.searchKeymap,
          ...(wordWrap ? [EditorView.lineWrapping] : []),
        ];
        const editor = CodeMirror(container, {
          value: tab.content,
          extensions,
          basicSetup: {
            lineNumbers: true,
            highlightActiveLineGutter: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          },
          tabSize: indentation,
          indentUnit: indentation,
        });

        editor.on("change", (update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        });
      }
    });
  }, [tab.id]);

  return <div id={`editor-${tab.id}`} className="h-full w-full text-sm" />;
});

import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
