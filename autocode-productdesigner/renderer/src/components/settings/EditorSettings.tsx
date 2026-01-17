import { useSettings } from '@/hooks/useSettings';
import { Label } from '@/components/ui/label';

export const EditorSettings = () => {
  const { settings, updateEditor } = useSettings();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-medium text-zed-text">Font</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-zed-text-muted">Font Family</Label>
            <input
              type="text"
              value={settings.editor.fontFamily}
              onChange={(e) => updateEditor({ fontFamily: e.target.value })}
              className="w-full rounded-md border border-zed-border bg-zed-element px-3 py-2 text-sm text-zed-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
              placeholder="SF Mono, Menlo, Consolas, monospace"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-zed-text-muted">Font Size</Label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="10"
                max="24"
                step="1"
                value={settings.editor.fontSize}
                onChange={(e) => updateEditor({ fontSize: parseInt(e.target.value) })}
                className="w-32"
              />
              <span className="text-sm text-zed-text">{settings.editor.fontSize}px</span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-zed-text-muted">Line Height</Label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.1"
                value={settings.editor.lineHeight}
                onChange={(e) => updateEditor({ lineHeight: parseFloat(e.target.value) })}
                className="w-32"
              />
              <span className="text-sm text-zed-text">{settings.editor.lineHeight}</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-zed-text">Enable Font Ligatures</div>
              <div className="text-xs text-zed-text-muted">Render combined characters</div>
            </div>
            <input
              type="checkbox"
              checked={settings.editor.fontLigatures}
              onChange={(e) => updateEditor({ fontLigatures: e.target.checked })}
              className="h-4 w-4 cursor-pointer rounded border-zed-border bg-zed-element"
            />
          </div>
        </div>
      </div>

      <hr className="border-zed-border-alt" />

      <div>
        <h3 className="mb-4 text-lg font-medium text-zed-text">Indentation</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-zed-text-muted">Indent Using</Label>
            <select
              value={settings.editor.indentUsing}
              onChange={(e) => updateEditor({ indentUsing: e.target.value as 'spaces' | 'tabs' })}
              className="w-32 rounded-md border border-zed-border bg-zed-element px-3 py-2 text-sm text-zed-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
            >
              <option value="spaces">Spaces</option>
              <option value="tabs">Tabs</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label className="text-zed-text-muted">Tab Size</Label>
            <select
              value={settings.editor.tabSize.toString()}
              onChange={(e) => updateEditor({ tabSize: parseInt(e.target.value) })}
              className="w-20 rounded-md border border-zed-border bg-zed-element px-3 py-2 text-sm text-zed-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
            >
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="8">8</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-zed-text">Insert Spaces on Tab</div>
            </div>
            <input
              type="checkbox"
              checked={settings.editor.insertSpaces}
              onChange={(e) => updateEditor({ insertSpaces: e.target.checked })}
              className="h-4 w-4 cursor-pointer rounded border-zed-border bg-zed-element"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-zed-text">Trim Trailing Whitespace</div>
            </div>
            <input
              type="checkbox"
              checked={settings.editor.trimTrailingWhitespace}
              onChange={(e) => updateEditor({ trimTrailingWhitespace: e.target.checked })}
              className="h-4 w-4 cursor-pointer rounded border-zed-border bg-zed-element"
            />
          </div>
        </div>
      </div>

      <hr className="border-zed-border-alt" />

      <div>
        <h3 className="mb-4 text-lg font-medium text-zed-text">Rendering</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-zed-text-muted">Line Numbers</Label>
            <select
              value={settings.editor.lineNumbers ? 'on' : 'off'}
              onChange={(e) => updateEditor({ lineNumbers: e.target.value === 'on' })}
              className="w-32 rounded-md border border-zed-border bg-zed-element px-3 py-2 text-sm text-zed-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label className="text-zed-text-muted">Word Wrap</Label>
            <select
              value={settings.editor.wordWrap ? 'on' : 'off'}
              onChange={(e) => updateEditor({ wordWrap: e.target.value === 'on' })}
              className="w-32 rounded-md border border-zed-border bg-zed-element px-3 py-2 text-sm text-zed-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
            >
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label className="text-zed-text-muted">Minimap</Label>
            <select
              value={settings.editor.minimap ? 'on' : 'off'}
              onChange={(e) => updateEditor({ minimap: e.target.value === 'on' })}
              className="w-32 rounded-md border border-zed-border bg-zed-element px-3 py-2 text-sm text-zed-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label className="text-zed-text-muted">Render Whitespace</Label>
            <select
              value={settings.editor.renderWhitespace}
              onChange={(e) => updateEditor({ renderWhitespace: e.target.value as 'none' | 'border' | 'all' })}
              className="w-32 rounded-md border border-zed-border bg-zed-element px-3 py-2 text-sm text-zed-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
            >
              <option value="none">None</option>
              <option value="border">Border</option>
              <option value="all">All</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-zed-text">Bracket Pair Guide</div>
            </div>
            <input
              type="checkbox"
              checked={settings.editor.bracketPairGuide}
              onChange={(e) => updateEditor({ bracketPairGuide: e.target.checked })}
              className="h-4 w-4 cursor-pointer rounded border-zed-border bg-zed-element"
            />
          </div>
        </div>
      </div>

      <hr className="border-zed-border-alt" />

      <div>
        <h3 className="mb-4 text-lg font-medium text-zed-text">Cursor</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-zed-text">Cursor Blinking</div>
            </div>
            <input
              type="checkbox"
              checked={settings.editor.cursorBlink}
              onChange={(e) => updateEditor({ cursorBlink: e.target.checked })}
              className="h-4 w-4 cursor-pointer rounded border-zed-border bg-zed-element"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-zed-text-muted">Cursor Style</Label>
            <select
              value={settings.editor.cursorStyle}
              onChange={(e) => updateEditor({ cursorStyle: e.target.value as 'block' | 'line' | 'underline' })}
              className="w-32 rounded-md border border-zed-border bg-zed-element px-3 py-2 text-sm text-zed-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
            >
              <option value="block">Block</option>
              <option value="line">Line</option>
              <option value="underline">Underline</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-zed-text">Enable Multi-Cursor</div>
              <div className="text-xs text-zed-text-muted">Allow multiple cursors (Alt+Click)</div>
            </div>
            <input
              type="checkbox"
              checked={settings.editor.multiCursor}
              onChange={(e) => updateEditor({ multiCursor: e.target.checked })}
              className="h-4 w-4 cursor-pointer rounded border-zed-border bg-zed-element"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
