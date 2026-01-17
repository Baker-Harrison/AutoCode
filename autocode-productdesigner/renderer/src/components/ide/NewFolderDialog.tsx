import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogFooter } from "@/components/ui/dialog";

interface NewFolderDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  defaultPath?: string;
}

export function NewFolderDialog({ open, onClose, onCreate, defaultPath }: NewFolderDialogProps) {
  const [name, setName] = useState("");

  const handleSubmit = () => {
    if (name.trim()) {
      onCreate(name.trim());
      setName("");
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="New Folder">
      <div className="space-y-4">
        <div className="text-xs text-zed-text-muted">
          Create a new folder in: {defaultPath || "."}
        </div>
        <Input
          autoFocus
          placeholder="folder-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
