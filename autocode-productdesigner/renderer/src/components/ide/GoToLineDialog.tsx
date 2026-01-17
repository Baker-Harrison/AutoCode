import { useState, useEffect, useRef } from "react";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface GoToLineDialogProps {
  open: boolean;
  onClose: () => void;
  onGoToLine: (line: number) => void;
  maxLine: number;
}

export function GoToLineDialog({ open, onClose, onGoToLine, maxLine }: GoToLineDialogProps) {
  const [lineNumber, setLineNumber] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const handleGo = () => {
    const line = parseInt(lineNumber, 10);
    if (!isNaN(line) && line >= 1 && line <= maxLine) {
      onGoToLine(line);
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleGo();
    } else if (event.key === "Escape") {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Go to Line">
      <div className="flex flex-col gap-3">
        <div className="text-xs text-zed-text-muted">
          Enter a line number between 1 and {maxLine}
        </div>
        <input
          ref={inputRef}
          type="number"
          min="1"
          max={maxLine}
          value={lineNumber}
          onChange={(e) => setLineNumber(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Line number (1-${maxLine})`}
          className="h-9 rounded-md border border-zed-border bg-zed-element px-3 py-1 text-sm text-zed-text placeholder:text-zed-text-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
        />
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleGo} disabled={!lineNumber}>
            Go
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
