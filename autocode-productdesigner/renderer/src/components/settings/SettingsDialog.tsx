import { useState } from 'react';
import { SettingsPanel } from './SettingsPanel';
import { X } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 h-[80vh] w-full max-w-4xl overflow-hidden rounded-md border border-zed-border bg-zed-panel shadow-lg">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-zed-border-alt px-4 py-3">
            <h2 className="text-sm font-semibold text-zed-text">Settings</h2>
            <button
              onClick={onClose}
              className="text-zed-text-muted hover:text-zed-text"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <SettingsPanel onClose={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
}
