import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, closeBrackets } from "@codemirror/autocomplete";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { keymap, highlightSpecialChars, drawSelection, lineNumbers, EditorView, Decoration } from "@codemirror/view";
import { StateField, StateEffect, Extension } from "@codemirror/state";
import type { Tab } from "@/types/ipc";
import { Button } from "@/components/ui/button";
import { FindReplacePanel } from "./FindReplacePanel";
import { GoToLineDialog } from "./GoToLineDialog";
import { getLanguageByPath, getLanguageName, detectLanguageFromContent, getAvailableLanguages, getLanguageByExtension } from "@/lib/languageDetection";
import { cn } from "@/lib/utils";
import { ChevronRight, ArrowDown, ArrowUp, Menu, Maximize, Minimize, Save, Settings2 } from "lucide-react";

type EditorPanelProps = {
  tab: Tab | null;
  onTabChange: (content: string) => void;
  workspace?: string | null;
  autosaveEnabled?: boolean;
  onToggleAutosave?: (enabled: boolean) => void;
  indentation?: 2 | 4 | 8;
  onIndentationChange?: (value: 2 | 4 | 8) => void;
  wordWrap?: boolean;
  onWordWrapChange?: (enabled: boolean) => void;
};

interface EditorState {
  line: number;
  column: number;
  matchCount: number;
  currentMatch: number;
}

const searchHighlightDecoration = Decoration.mark({ class: "search-match" });

const searchHighlightState = StateField.define<readonly { from: number; to: number }[]>({
  create() { return [] },
  update(decorations, tr) {
    return decorations.map(d => d.update({ from: d.from + tr.changes.length, to: d.to + tr.changes.length })) as readonly { from: number; to: number }[];
  },
  provide(f) {
    return EditorView.decorations.from(f, decorations =>
      decorations.map(d => searchHighlightDecoration.range(d.from, d.to))
    );
  }
});

export const EditorPanel = ({
  tab,
  onTabChange,
  workspace,
  autosaveEnabled = false,
  onToggleAutosave,
  indentation = 2,
  onIndentationChange,
  wordWrap = false,
  onWordWrapChange
}: EditorPanelProps) => {
  const [showFind, setShowFind] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);
  const [focusFind, setFocusFind] = useState(false);
  const [editorState, setEditorState] = useState<EditorState>({ line: 1, column: 1, matchCount: 0, currentMatch: 0 });
  const [showGoToLine, setShowGoToLine] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [lineEnding, setLineEnding] = useState("LF");
  const editorRef = useRef<any>(null);
  const [languageExtension, setLanguageExtension] = useState<Extension[]>(() => [javascript()]);
  const [languageName, setLanguageName] = useState("JavaScript");
  const [selectedLangExt, setSelectedLangExt] = useState("");
  const [docLines, setDocLines] = useState(1);
  const findQueryRef = useRef("");
  const [showIndentationMenu, setShowIndentationMenu] = useState(false);

  const availableLanguages = useMemo(() => getAvailableLanguages(), []);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newExt = e.target.value;
    const fileExt = tab?.file.name.includes(".")
      ? tab.file.name.slice(tab.file.name.lastIndexOf(".")).toLowerCase()
      : "";

    if (newExt) {
      localStorage.setItem(`langOverride:${fileExt}`, newExt);
    } else {
      localStorage.removeItem(`langOverride:${fileExt}`);
    }

    setSelectedLangExt(newExt);

    if (newExt) {
      const lang = getLanguageByExtension(newExt);
      if (lang) {
        setLanguageExtension([lang]);
        setLanguageName(getLanguageName("file." + newExt));
      }
    } else {
      const lang = detectLanguageFromContent(tab?.file.name || "", tab?.content || "");
      if (lang) {
        setLanguageExtension([lang]);
      } else {
        setLanguageExtension([javascript()]);
      }
      setLanguageName(getLanguageName(tab?.file.name || ""));
    }
  };

  const getBreadcrumbs = () => {
    if (!tab || !workspace) return [];

    const relativePath = tab.file.relativePath;
    const parts = relativePath.split(/[\\/]/);
    const breadcrumbs = [];

    const workspaceName = workspace.split(/[\\/]/).pop() || workspace;
    breadcrumbs.push({ name: workspaceName, path: workspace, isWorkspace: true });

    let currentPath = workspace;
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      breadcrumbs.push({ name: parts[i], path: currentPath, isWorkspace: false });
    }

    breadcrumbs.push({
      name: parts[parts.length - 1],
      path: tab.file.relativePath,
      isFile: true,
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  useEffect(() => {
    if (tab) {
      const fileExt = tab.file.name.includes(".")
        ? tab.file.name.slice(tab.file.name.lastIndexOf(".")).toLowerCase()
        : "";

      const storageKey = `langOverride:${fileExt}`;
      const override = localStorage.getItem(storageKey);

      let lang: Extension | null = null;
      let name = getLanguageName(tab.file.name);

      if (override) {
        lang = getLanguageByExtension(override);
        if (lang) {
          name = getLanguageName("file." + override);
          setSelectedLangExt(override);
        }
      }

      if (!lang) {
        lang = detectLanguageFromContent(tab.file.name, tab.content);
      }

      if (lang) {
        setLanguageExtension([lang]);
      } else {
        setLanguageExtension([javascript()]);
      }
      setLanguageName(name);
    }
  }, [tab]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setShowFind(true);
        setReplaceMode(event.shiftKey);
        setFocusFind(true);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "h") {
        event.preventDefault();
        setShowFind(true);
        setReplaceMode(true);
        setFocusFind(true);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "g") {
        event.preventDefault();
        if (tab) {
          setShowGoToLine(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tab]);

  const performSearch = (view: EditorView, query: string, options: any): { from: number; to: number }[] => {
    const results: { from: number; to: number }[] = [];
    const text = view.state.doc.toString();
    try {
      const regex = options.regex
        ? new RegExp(query, options.caseSensitive ? 'gm' : 'gmi')
        : new RegExp(escapeRegex(query), options.caseSensitive ? 'g' : 'gi');

      let match;
      while ((match = regex.exec(text)) !== null) {
        results.push({ from: match.index, to: match.index + match[0].length });
      }
    } catch {
      const searchStr = query.toLowerCase();
      const textLower = text.toLowerCase();
      let pos = 0;
      while (true) {
        const idx = options.caseSensitive
          ? text.indexOf(searchStr, pos)
          : textLower.indexOf(searchStr, pos);
        if (idx === -1) break;
        const endIdx = options.wholeWord
          ? findWordEnd(text, idx)
          : idx + searchStr.length;
        results.push({ from: idx, to: endIdx });
        pos = endIdx;
      }
    }
    return results;
  };

  const findWordEnd = (text: string, start: number): number => {
    let end = start;
    while (end < text.length && /\w/.test(text[end])) {
      end++;
    }
    return end;
  };

  const escapeRegex = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const handleFind = useCallback((query: string, options: any) => {
    findQueryRef.current = query;
    if (editorRef.current?.view && query) {
      try {
        const view = editorRef.current.view;
        const searchResults = performSearch(view, query, options);
        setEditorState(prev => ({ ...prev, matchCount: searchResults.length, currentMatch: 0 }));
      } catch {
        setEditorState(prev => ({ ...prev, matchCount: 0, currentMatch: 0 }));
      }
    }
  }, []);

  const handleFindNext = useCallback(() => {
    if (editorRef.current?.view && findQueryRef.current) {
      const view = editorRef.current.view;
      setEditorState(prev => {
        const newMatch = prev.currentMatch + 1;
        if (newMatch < prev.matchCount) {
          const text = view.state.doc.toString();
          const results: { from: number; to: number }[] = [];
          let pos = 0;
          while (true) {
            const idx = text.indexOf(findQueryRef.current, pos);
            if (idx === -1) break;
            results.push({ from: idx, to: idx + findQueryRef.current.length });
            pos = idx + 1;
          }
          if (results[newMatch]) {
            const line = view.state.doc.lineAt(results[newMatch].from);
            const offset = results[newMatch].from - line.from;
            view.dispatch({
              selection: { anchor: line.from + offset },
              effects: EditorView.scrollIntoView(results[newMatch].from, { yMargin: 200 })
            });
          }
          return { ...prev, currentMatch: newMatch };
        }
        return prev;
      });
    }
  }, []);

  const handleFindPrev = useCallback(() => {
    if (editorRef.current?.view && findQueryRef.current) {
      const view = editorRef.current.view;
      setEditorState(prev => {
        const newMatch = prev.currentMatch - 1;
        if (newMatch >= 0) {
          const text = view.state.doc.toString();
          const results: { from: number; to: number }[] = [];
          let pos = 0;
          while (true) {
            const idx = text.indexOf(findQueryRef.current, pos);
            if (idx === -1) break;
            results.push({ from: idx, to: idx + findQueryRef.current.length });
            pos = idx + 1;
          }
          if (results[newMatch]) {
            const line = view.state.doc.lineAt(results[newMatch].from);
            const offset = results[newMatch].from - line.from;
            view.dispatch({
              selection: { anchor: line.from + offset },
              effects: EditorView.scrollIntoView(results[newMatch].from, { yMargin: 200 })
            });
          }
          return { ...prev, currentMatch: newMatch };
        }
        return prev;
      });
    }
  }, []);

  const handleReplace = useCallback((query: string, replacement: string, all: boolean) => {
    if (editorRef.current?.view && query) {
      const view = editorRef.current.view;
      if (all) {
        replaceAll(view, query, replacement);
      } else {
        replaceNext(view, query, replacement);
      }
      const searchResults = performSearch(view, query, { caseSensitive: false, wholeWord: false, regex: false });
      setEditorState(prev => ({ ...prev, matchCount: searchResults.length }));
    }
  }, []);

  const replaceNext = (view: EditorView, query: string, replacement: string) => {
    const selection = view.state.selection.main;
    const selectedText = view.state.doc.sliceString(selection.from, selection.to);
    if (selectedText === query) {
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: replacement },
        selection: { anchor: selection.from + replacement.length }
      });
    } else {
      handleFindNext();
    }
  };

  const replaceAll = (view: EditorView, query: string, replacement: string) => {
    const text = view.state.doc.toString();
    try {
      const regex = new RegExp(escapeRegex(query), 'g');
      const newText = text.replace(regex, replacement);
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: newText }
      });
    } catch {
      const newText = text.split(query).join(replacement);
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: newText }
      });
    }
  };

  const handleCursorActivity = useCallback((update: any) => {
    if (update.state) {
      const state = update.state;
      const cursor = state.selection.main.head;
      const line = state.doc.lineAt(cursor);
      setDocLines(state.doc.lines);
      setEditorState(prev => ({
        ...prev,
        line: line.number,
        column: cursor - line.from + 1
      }));
    }
  }, []);

  const goToLine = useCallback((line: number) => {
    if (editorRef.current?.view) {
      const view = editorRef.current.view;
      const linePos = view.state.doc.line(line);
      view.dispatch({
        selection: { anchor: linePos.from },
        effects: EditorView.scrollIntoView(linePos.from, { yMargin: 200 })
      });
      view.focus();
    }
  }, []);

  const extensions = useMemo(() => {
    const exts = [
      highlightSpecialChars(),
      drawSelection(),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      indentOnInput(),
      highlightSelectionMatches(),
      keymap.of(searchKeymap),
      EditorView.updateListener.of(handleCursorActivity),
      ...languageExtension
    ];

    if (wordWrap) {
      exts.push(EditorView.lineWrapping);
    }

    return exts;
  }, [languageExtension, wordWrap, handleCursorActivity]);

  if (!tab) {
    return (
      <div className="flex h-full items-center justify-center bg-zed-bg text-zed-text-muted text-sm">
        <div className="text-center">
          <div className="mb-2 text-2xl opacity-50">No file open</div>
          <div className="text-xs">Select a file from the explorer to start editing</div>
        </div>
      </div>
    );
  }

  const fileName = tab.file.relativePath.split(/[\\/]/).pop() || tab.file.relativePath;

  return (
    <div className="flex h-full flex-col">
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1 border-b border-zed-border-alt px-4 py-1 text-xs text-zed-text-muted">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.path} className="flex items-center">
              {index > 0 && <ChevronRight size={12} />}
              {crumb.isFile ? (
                <span className="text-zed-text">{crumb.name}</span>
              ) : (
                <button
                  className="hover:text-zed-text"
                  onClick={() => {
                    if (crumb.isWorkspace && workspace) {
                      window.ide.listDir(workspace);
                    } else if (crumb.path) {
                      window.ide.listDir(crumb.path);
                    }
                  }}
                >
                  {crumb.name}
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between border-b border-zed-border bg-zed-panel px-4 py-1.5 text-xs text-zed-text-muted">
        <div className="flex items-center gap-3">
          <span className="truncate max-w-[200px] font-medium text-zed-text">{fileName}</span>
          {tab.isDirty && <span className="text-amber-400">●</span>}
          <select
            value={selectedLangExt}
            onChange={handleLanguageChange}
            className="rounded bg-zed-element px-1.5 py-0.5 text-[10px] text-zed-text focus:outline-none cursor-pointer"
            title="Select Language"
          >
            <option value="">{languageName}</option>
            {availableLanguages.filter(l => l.ext).map(lang => (
              <option key={lang.ext} value={lang.ext}>{lang.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className={cn(
                "rounded px-1.5 py-0.5 transition-colors",
                showLineNumbers ? "text-zed-text bg-zed-element" : "hover:text-zed-text hover:bg-zed-element-hover"
              )}
              title="Toggle Line Numbers"
            >
              Ln
            </button>
            <button
              className={`flex items-center gap-1 transition-colors ${
                wordWrap ? "text-zed-text" : "hover:text-zed-text"
              }`}
              onClick={() => onWordWrapChange?.(!wordWrap)}
            >
              Wrap
            </button>
            <div className="relative">
              <button
                className="flex items-center gap-1 hover:text-zed-text transition-colors"
                onClick={() => setShowIndentationMenu(!showIndentationMenu)}
              >
                <span>Indent: {indentation}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M2 3L5 6L2 9L1 8L3.5 6L1 4L2 3Z" />
                </svg>
              </button>
              {showIndentationMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-zed-panel border border-zed-border rounded-md shadow-lg py-1">
                  {[2, 4, 8].map((value) => (
                    <button
                      key={value}
                      className={`block w-full text-left px-4 py-1 text-xs hover:bg-zed-element-hover ${
                        indentation === value ? "text-zed-accent" : ""
                      }`}
                      onClick={() => {
                        onIndentationChange?.(value as 2 | 4 | 8);
                        setShowIndentationMenu(false);
                      }}
                    >
                      {value} spaces
                    </button>
                  ))}
                </div>
              )}
            </div>
            <select
              value={lineEnding}
              onChange={(e) => setLineEnding(e.target.value)}
              className="rounded bg-zed-element px-1.5 py-0.5 text-[10px] text-zed-text focus:outline-none"
              title="Line Endings"
            >
              <option value="LF">LF</option>
              <option value="CRLF">CRLF</option>
            </select>
          </div>
          <span className="text-[10px]">UTF-8</span>
          <button
            className={`flex items-center gap-1 transition-colors ${
              autosaveEnabled ? "text-green-400" : "hover:text-zed-text"
            }`}
            onClick={() => onToggleAutosave?.(!autosaveEnabled)}
            title="Toggle Autosave"
          >
            Auto
          </button>
          <span className="text-[10px]">INS</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-zed-bg relative">
        <CodeMirror
          ref={editorRef}
          value={tab.content}
          height="100%"
          theme="dark"
          extensions={extensions}
          basicSetup={{
            lineNumbers: showLineNumbers,
            highlightActiveLineGutter: true,
            highlightSpecialChars: false,
            history: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: false,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
          }}
          onChange={onTabChange}
          className="h-full"
        />
        {showFind && (
          <div className="absolute bottom-0 left-0 right-0 z-10">
            <FindReplacePanel
              onFind={handleFind}
              onFindNext={handleFindNext}
              onFindPrev={handleFindPrev}
              onReplace={handleReplace}
              onClose={() => setShowFind(false)}
              matchCount={editorState.matchCount}
              currentMatch={editorState.currentMatch}
              replaceMode={replaceMode}
              focusFind={focusFind}
            />
          </div>
        )}
        <GoToLineDialog
          open={showGoToLine}
          onClose={() => setShowGoToLine(false)}
          onGoToLine={goToLine}
          maxLine={docLines}
        />
      </div>
      <div className="flex items-center justify-between border-t border-zed-border bg-zed-panel px-4 py-1 text-xs text-zed-text-muted">
        <div className="flex items-center gap-4">
          <span className="truncate max-w-[200px]">{tab.file.relativePath}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="min-w-[60px]">Ln {editorState.line}, Col {editorState.column}</span>
          <span>Spaces: {indentation}</span>
          <span>{lineEnding}</span>
          <span>[INS]</span>
        </div>
      </div>
    </div>
  );
};
