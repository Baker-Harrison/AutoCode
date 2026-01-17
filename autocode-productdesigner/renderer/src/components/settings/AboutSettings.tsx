import { Button } from '@/components/ui/button';
import { ExternalLink, Github, BookOpen, LifeBuoy } from 'lucide-react';

const APP_VERSION = '0.1.0';
const BUILD_DATE = new Date().toISOString().split('T')[0];

export const AboutSettings = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-zed-element text-2xl font-bold text-zed-text">
          A
        </div>
        <div>
          <h3 className="text-xl font-bold text-zed-text">Autocode IDE</h3>
          <p className="text-sm text-zed-text-muted">Version {APP_VERSION}</p>
        </div>
      </div>

      <div className="rounded-md border border-zed-border-alt bg-zed-element p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-zed-text-muted">Build:</span>
            <span className="ml-2 text-zed-text">{BUILD_DATE}</span>
          </div>
          <div>
            <span className="text-zed-text-muted">Electron:</span>
            <span className="ml-2 text-zed-text">33.2.0</span>
          </div>
          <div>
            <span className="text-zed-text-muted">Node:</span>
            <span className="ml-2 text-zed-text">22.x</span>
          </div>
          <div>
            <span className="text-zed-text-muted">React:</span>
            <span className="ml-2 text-zed-text">18.3.1</span>
          </div>
        </div>
      </div>

      <hr className="border-zed-border-alt" />

      <div>
        <h4 className="mb-3 text-sm font-medium text-zed-text">Resources</h4>
        <div className="space-y-2">
          <a
            href="https://docs.autocode.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zed-text-muted hover:bg-zed-element hover:text-zed-text"
          >
            <BookOpen size={16} />
            Documentation
            <ExternalLink size={12} className="ml-auto" />
          </a>
          <a
            href="https://github.com/autocode/autocode-ide"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zed-text-muted hover:bg-zed-element hover:text-zed-text"
          >
            <Github size={16} />
            GitHub Repository
            <ExternalLink size={12} className="ml-auto" />
          </a>
          <a
            href="https://github.com/autocode/autocode-ide/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zed-text-muted hover:bg-zed-element hover:text-zed-text"
          >
            <LifeBuoy size={16} />
            Report Issues
            <ExternalLink size={12} className="ml-auto" />
          </a>
        </div>
      </div>

      <hr className="border-zed-border-alt" />

      <div>
        <h4 className="mb-3 text-sm font-medium text-zed-text">License</h4>
        <p className="text-sm text-zed-text-muted">
          Autocode IDE is MIT licensed. See the LICENSE file for details.
        </p>
      </div>
    </div>
  );
};
