import * as React from "react";
import { useEffect, useState } from "react";
import path from "path";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogFooter } from "@/components/ui/dialog";

interface RenameDialogProps {
  open: boolean;
  onClose: () => void;
  onRename: (newName: string) => void;
  entryName: string;
  isDirectory: boolean;
}

export function RenameDialog({ open, onClose, onRename, entryName, isDirectory }: RenameDialogProps) {
  const [name, setName] = useState(entryName);

  React.useEffect(() => {
    if (open) {
      setName(entryName);
    }
  }, [open, entryName]);

  const handleSubmit = () => {
    if (name.trim() && name.trim() !== entryName) {
      onRename(name.trim());
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleSubmit();
    }
  };

  const extension = isDirectory ? "" : path.extname(entryName);

  return (
    <Dialog open={open} onClose={onClose} title="Rename">
      <div className="space-y-4">
        <div className="text-xs text-zed-text-muted">
          Enter a new name for: {entryName}
        </div>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="new-name"
        />
        {!isDirectory && extension && (
          <div className="text-[10px] text-zed-text-muted">
            Extension will be preserved: {extension}
          </div>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || name.trim() === entryName}>
            Rename
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
