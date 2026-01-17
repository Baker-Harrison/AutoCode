import { useSettings } from '@/hooks/useSettings';
import { Label } from '@/components/ui/label';

export const TerminalSettings = () => {
  const { settings, updateTerminal } = useSettings();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-medium text-zed-text">Shell</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-zed-text-muted">Shell Type</Label>
            <select
              value={settings.terminal.shell}
              onChange={(e) => updateTerminal({ shell: e.target.value })}
              className="w-48 rounded-md border border-zed-border bg-zed-element px-3 py-2 text-sm text-zed-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
            >
              <option value="powershell">PowerShell</option>
              <option value="cmd">Command Prompt</option>
              <option value="wsl">WSL</option>
              <option value="gitbash">Git Bash</option>
            </select>
          </div>
        </div>
      </div>

      <hr className="border-zed-border-alt" />

      <div>
        <h3 className="mb-4 text-lg font-medium text-zed-text">Font</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-zed-text-muted">Font Family</Label>
            <input
              type="text"
              value={settings.terminal.fontFamily}
              onChange={(e) => updateTerminal({ fontFamily: e.target.value })}
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
                max="20"
                step="1"
                value={settings.terminal.fontSize}
                onChange={(e) => updateTerminal({ fontSize: parseInt(e.target.value) })}
                className="w-32"
              />
              <span className="text-sm text-zed-text">{settings.terminal.fontSize}px</span>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-zed-border-alt" />

      <div>
        <h3 className="mb-4 text-lg font-medium text-zed-text">Cursor</h3>
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm text-zed-text">Cursor Blinking</div>
          </div>
          <input
            type="checkbox"
            checked={settings.terminal.cursorBlink}
            onChange={(e) => updateTerminal({ cursorBlink: e.target.checked })}
            className="h-4 w-4 cursor-pointer rounded border-zed-border bg-zed-element"
          />
        </div>
      </div>

      <hr className="border-zed-border-alt" />

      <div>
        <h3 className="mb-4 text-lg font-medium text-zed-text">Behavior</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-zed-text-muted">Scrollback Buffer Size</Label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={settings.terminal.scrollback}
                onChange={(e) => updateTerminal({ scrollback: parseInt(e.target.value) })}
                className="w-48"
              />
              <span className="text-sm text-zed-text">{settings.terminal.scrollback} lines</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-zed-text">Copy on Selection</div>
              <div className="text-xs text-zed-text-muted">Automatically copy selected text</div>
            </div>
            <input
              type="checkbox"
              checked={settings.terminal.copyOnSelect}
              onChange={(e) => updateTerminal({ copyOnSelect: e.target.checked })}
              className="h-4 w-4 cursor-pointer rounded border-zed-border bg-zed-element"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-zed-text">Paste on Right-Click</div>
              <div className="text-xs text-zed-text-muted">Paste clipboard content on right-click</div>
            </div>
            <input
              type="checkbox"
              checked={settings.terminal.rightClickPaste}
              onChange={(e) => updateTerminal({ rightClickPaste: e.target.checked })}
              className="h-4 w-4 cursor-pointer rounded border-zed-border bg-zed-element"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
