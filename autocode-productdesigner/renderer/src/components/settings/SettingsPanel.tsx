import { useState } from 'react';
import { SettingsCategory, keyboardShortcuts } from '@autocode/types';
import { GeneralSettings } from './GeneralSettings';
import { EditorSettings } from './EditorSettings';
import { TerminalSettings } from './TerminalSettings';
import { GitSettings } from './GitSettings';
import { ExtensionsSettings } from './ExtensionsSettings';
import { AboutSettings } from './AboutSettings';
import { KeyboardShortcutSettings } from './KeyboardShortcutSettings';
import { Settings as SettingsIcon, Type, Palette, FileCode, Terminal, GitBranch, Puzzle, Info, Keyboard } from 'lucide-react';

interface SettingsPanelProps {
  onClose?: () => void;
}

type CategoryType = SettingsCategory | 'keyboard';

const categories: { id: CategoryType; label: string; icon: typeof SettingsIcon }[] = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'editor', label: 'Editor', icon: Type },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'git', label: 'Git', icon: GitBranch },
  { id: 'extensions', label: 'Extensions', icon: Puzzle },
  { id: 'keyboard', label: 'Shortcuts', icon: Keyboard },
  { id: 'about', label: 'About', icon: Info },
];

export const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  const [category, setCategory] = useState<CategoryType>('general');

  return (
    <div className="flex h-full">
      <div className="w-48 border-r border-zed-border bg-zed-panel p-3">
        <div className="mb-2 text-xs font-semibold text-zed-text-muted">SETTINGS</div>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm ${
              category === cat.id
                ? 'bg-zed-element text-zed-text'
                : 'text-zed-text-muted hover:bg-zed-element'
            }`}
          >
            <cat.icon size={14} />
            {cat.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {category === 'general' && <GeneralSettings />}
        {category === 'editor' && <EditorSettings />}
        {category === 'terminal' && <TerminalSettings />}
        {category === 'git' && <GitSettings />}
        {category === 'extensions' && <ExtensionsSettings />}
        {category === 'about' && <AboutSettings />}
        {category === 'keyboard' && <KeyboardShortcutSettings />}
      </div>
    </div>
  );
};
