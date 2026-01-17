import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Trash2, Power } from 'lucide-react';

type Extension = {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  enabled: boolean;
};

const installedExtensions: Extension[] = [
  {
    id: 'gitlens',
    name: 'GitLens',
    description: 'Supercharge Git within VS Code',
    version: '14.0.0',
    author: 'GitKraken',
    enabled: true,
  },
  {
    id: 'prettier',
    name: 'Prettier',
    description: 'Code formatter using Prettier',
    version: '10.0.0',
    author: 'Prettier',
    enabled: true,
  },
  {
    id: 'eslint',
    name: 'ESLint',
    description: 'Integrates ESLint JavaScript',
    version: '9.0.0',
    author: 'Microsoft',
    enabled: false,
  },
];

export const ExtensionsSettings = () => {
  const [extensions, setExtensions] = useState(installedExtensions);

  const toggleExtension = (id: string) => {
    setExtensions(prev =>
      prev.map(ext =>
        ext.id === id ? { ...ext, enabled: !ext.enabled } : ext
      )
    );
  };

  const removeExtension = (id: string) => {
    setExtensions(prev => prev.filter(ext => ext.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-zed-text">Installed Extensions</h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.open('https://marketplace.visualstudio.com/vscode', '_blank')}
        >
          <ExternalLink size={14} />
          Browse Marketplace
        </Button>
      </div>

      <div className="space-y-3">
        {extensions.length === 0 ? (
          <div className="py-8 text-center text-sm text-zed-text-muted">
            No extensions installed
          </div>
        ) : (
          extensions.map(extension => (
            <div
              key={extension.id}
              className="flex items-start justify-between rounded-md border border-zed-border-alt bg-zed-element p-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zed-text">{extension.name}</span>
                  <span className="text-xs text-zed-text-muted">v{extension.version}</span>
                </div>
                <p className="mt-1 text-sm text-zed-text-muted">{extension.description}</p>
                <p className="mt-1 text-xs text-zed-text-muted">by {extension.author}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleExtension(extension.id)}
                  className={`rounded p-1.5 ${
                    extension.enabled
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-zed-panel text-zed-text-muted hover:text-zed-text'
                  }`}
                  title={extension.enabled ? 'Disable' : 'Enable'}
                >
                  <Power size={16} />
                </button>
                <button
                  onClick={() => removeExtension(extension.id)}
                  className="rounded p-1.5 text-zed-text-muted hover:text-red-400"
                  title="Remove"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <hr className="border-zed-border-alt" />

      <div>
        <h3 className="mb-4 text-lg font-medium text-zed-text">Recommended</h3>
        <p className="text-sm text-zed-text-muted">
          Browse the marketplace to discover more extensions.
        </p>
      </div>
    </div>
  );
};
