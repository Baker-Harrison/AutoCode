import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entryName: string;
  path: string;
  isDirectory: boolean;
}

export function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  entryName,
  path,
  isDirectory,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={isDirectory ? "Delete Folder" : "Delete File"}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-zed-text">
          <Trash2 size={24} className="text-red-400" />
          <div className="text-sm">
            {isDirectory
              ? "Are you sure you want to delete this folder and all its contents?"
              : "Are you sure you want to delete this file?"}
          </div>
        </div>
        <div className="rounded bg-zed-element p-2 text-xs text-zed-text-muted">
          <div className="font-medium">{entryName}</div>
          <div className="truncate">{path}</div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20"
            onClick={() => { onConfirm(); onClose(); }}>
            Delete
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
