import { useSettings } from '@/hooks/useSettings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const GeneralSettings = () => {
  const { settings, updateGeneral } = useSettings();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-medium text-zed-text">Appearance</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-zed-text-muted">Theme</Label>
            <select
              value={settings.general.theme}
              onChange={(e) => updateGeneral({ theme: e.target.value as 'dark' | 'light' | 'auto' })}
              className="w-48 rounded-md border border-zed-border bg-zed-element px-3 py-2 text-sm text-zed-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">System</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label className="text-zed-text-muted">Accent Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.general.accentColor}
                onChange={(e) => updateGeneral({ accentColor: e.target.value })}
                className="h-9 w-14 cursor-pointer rounded border border-zed-border bg-zed-element"
              />
              <Input
                value={settings.general.accentColor}
                onChange={(e) => updateGeneral({ accentColor: e.target.value })}
                className="w-32"
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-zed-text-muted">UI Font Family</Label>
            <Input
              value={settings.general.uiFontFamily}
              onChange={(e) => updateGeneral({ uiFontFamily: e.target.value })}
              placeholder="Inter, system-ui, sans-serif"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-zed-text-muted">UI Font Size</Label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="10"
                max="18"
                step="1"
                value={settings.general.uiFontSize}
                onChange={(e) => updateGeneral({ uiFontSize: parseInt(e.target.value) })}
                className="w-32"
              />
              <span className="text-sm text-zed-text">{settings.general.uiFontSize}px</span>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-zed-border-alt" />

      <div>
        <h3 className="mb-4 text-lg font-medium text-zed-text">Files</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-zed-text-muted">Auto Save</Label>
            <select
              value={settings.general.autoSave}
              onChange={(e) => updateGeneral({ autoSave: e.target.value as 'off' | 'delay' | 'onFocusChange' })}
              className="w-48 rounded-md border border-zed-border bg-zed-element px-3 py-2 text-sm text-zed-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
            >
              <option value="off">Off</option>
              <option value="delay">After Delay</option>
              <option value="onFocusChange">On Focus Change</option>
            </select>
          </div>

          {settings.general.autoSave === 'delay' && (
            <div className="grid gap-2">
              <Label className="text-zed-text-muted">Auto Save Delay (seconds)</Label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={settings.general.autoSaveDelay}
                  onChange={(e) => updateGeneral({ autoSaveDelay: parseInt(e.target.value) })}
                  className="w-32"
                />
                <span className="text-sm text-zed-text">{settings.general.autoSaveDelay}s</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-zed-text">Restore workspace on startup</div>
              <div className="text-xs text-zed-text-muted">Reopen the last workspace when launching</div>
            </div>
            <input
              type="checkbox"
              checked={settings.general.restoreWorkspace}
              onChange={(e) => updateGeneral({ restoreWorkspace: e.target.checked })}
              className="h-4 w-4 cursor-pointer rounded border-zed-border bg-zed-element"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-zed-text">Restore tabs on startup</div>
              <div className="text-xs text-zed-text-muted">Reopen the last open tabs</div>
            </div>
            <input
              type="checkbox"
              checked={settings.general.restoreTabs}
              onChange={(e) => updateGeneral({ restoreTabs: e.target.checked })}
              className="h-4 w-4 cursor-pointer rounded border-zed-border bg-zed-element"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
