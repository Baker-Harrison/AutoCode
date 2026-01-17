import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogFooter } from "@/components/ui/dialog";

interface NewFileDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  defaultPath?: string;
}

export function NewFileDialog({ open, onClose, onCreate, defaultPath }: NewFileDialogProps) {
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
    <Dialog open={open} onClose={onClose} title="New File">
      <div className="space-y-4">
        <div className="text-xs text-zed-text-muted">
          Create a new file in: {defaultPath || "."}
        </div>
        <Input
          autoFocus
          placeholder="filename.ext"
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
