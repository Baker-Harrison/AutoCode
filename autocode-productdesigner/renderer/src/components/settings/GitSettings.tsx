import { useSettings } from '@/hooks/useSettings';
import { Label } from '@/components/ui/label';

export const GitSettings = () => {
  const { settings, updateGit } = useSettings();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-medium text-zed-text">Integration</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-zed-text">Enable Git Integration</div>
              <div className="text-xs text-zed-text-muted">Show git status and commit panel</div>
            </div>
            <input
              type="checkbox"
              checked={settings.git.enabled}
              onChange={(e) => updateGit({ enabled: e.target.checked })}
              className="h-4 w-4 cursor-pointer rounded border-zed-border bg-zed-element"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-zed-text">Show Git in Sidebar</div>
              <div className="text-xs text-zed-text-muted">Display git status in the sidebar</div>
            </div>
            <input
              type="checkbox"
              checked={settings.git.showInSidebar}
              onChange={(e) => updateGit({ showInSidebar: e.target.checked })}
              className="h-4 w-4 cursor-pointer rounded border-zed-border bg-zed-element"
            />
          </div>
        </div>
      </div>

      <hr className="border-zed-border-alt" />

      <div>
        <h3 className="mb-4 text-lg font-medium text-zed-text">Auto Fetch</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-zed-text">Auto Fetch</div>
              <div className="text-xs text-zed-text-muted">Automatically fetch from remote</div>
            </div>
            <input
              type="checkbox"
              checked={settings.git.autoFetch}
              onChange={(e) => updateGit({ autoFetch: e.target.checked })}
              className="h-4 w-4 cursor-pointer rounded border-zed-border bg-zed-element"
            />
          </div>

          {settings.git.autoFetch && (
            <div className="grid gap-2">
              <Label className="text-zed-text-muted">Fetch Interval (minutes)</Label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={settings.git.fetchInterval}
                  onChange={(e) => updateGit({ fetchInterval: parseInt(e.target.value) })}
                  className="w-48"
                />
                <span className="text-sm text-zed-text">{settings.git.fetchInterval} min</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <hr className="border-zed-border-alt" />

      <div>
        <h3 className="mb-4 text-lg font-medium text-zed-text">Defaults</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-zed-text-muted">Default Branch Name</Label>
            <input
              type="text"
              value={settings.git.defaultBranch}
              onChange={(e) => updateGit({ defaultBranch: e.target.value })}
              className="w-48 rounded-md border border-zed-border bg-zed-element px-3 py-2 text-sm text-zed-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
              placeholder="main"
            />
            <p className="text-xs text-zed-text-muted">Used when creating new repositories</p>
          </div>
        </div>
      </div>
    </div>
  );
};
