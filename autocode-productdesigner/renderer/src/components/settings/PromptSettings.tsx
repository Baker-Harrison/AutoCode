import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import type { PromptFile, PromptFileContent } from "@/types/ipc";

export const PromptSettings = () => {
  const [files, setFiles] = useState<PromptFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<PromptFile | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const loadFiles = async () => {
    try {
      const result = await window.ide.getPromptFiles();
      setFiles(result);
    } catch (error) {
      showToast("Failed to load prompt files", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadFileContent = async (file: PromptFile) => {
    try {
      const result = await window.ide.readPromptFile(file.path);
      setFileContent(result.content);
      setSelectedFile(file);
    } catch (error) {
      showToast("Failed to load file content", "error");
    }
  };

  const saveFile = async () => {
    if (!selectedFile) {
      return;
    }

    setSaving(true);
    try {
      await window.ide.writePromptFile({
        path: selectedFile.path,
        content: fileContent
      });
      showToast("File saved successfully", "success");
    } catch (error) {
      showToast("Failed to save file", "error");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const categorizedFiles = {
    system: files.filter(f => f.category === "system"),
    behaviour: files.filter(f => f.category === "behaviour"),
    project: files.filter(f => f.category === "project")
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prompt Files</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-zed-text-muted">Loading...</div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-zed-text-muted">System Files</Label>
                <div className="mt-2 space-y-1">
                  {categorizedFiles.system.length === 0 ? (
                    <div className="text-sm text-zed-text-muted">No system files</div>
                  ) : (
                    categorizedFiles.system.map(file => (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => loadFileContent(file)}
                        className={`w-full rounded px-3 py-2 text-left text-sm ${
                          selectedFile?.path === file.path
                            ? "bg-zed-element-selected text-zed-text"
                            : "bg-zed-element text-zed-text-muted hover:bg-zed-border-alt"
                        }`}
                      >
                        {file.name}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div>
                <Label className="text-zed-text-muted">Behavior Files</Label>
                <div className="mt-2 space-y-1">
                  {categorizedFiles.behaviour.length === 0 ? (
                    <div className="text-sm text-zed-text-muted">No behavior files</div>
                  ) : (
                    categorizedFiles.behaviour.map(file => (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => loadFileContent(file)}
                        className={`w-full rounded px-3 py-2 text-left text-sm ${
                          selectedFile?.path === file.path
                            ? "bg-zed-element-selected text-zed-text"
                            : "bg-zed-element text-zed-text-muted hover:bg-zed-border-alt"
                        }`}
                      >
                        {file.name}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div>
                <Label className="text-zed-text-muted">Project Files</Label>
                <div className="mt-2 space-y-1">
                  {categorizedFiles.project.length === 0 ? (
                    <div className="text-sm text-zed-text-muted">No project files</div>
                  ) : (
                    categorizedFiles.project.map(file => (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => loadFileContent(file)}
                        className={`w-full rounded px-3 py-2 text-left text-sm ${
                          selectedFile?.path === file.path
                            ? "bg-zed-element-selected text-zed-text"
                            : "bg-zed-element text-zed-text-muted hover:bg-zed-border-alt"
                        }`}
                      >
                        {file.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedFile && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selectedFile.name}</CardTitle>
              <div className="flex items-center gap-2">
                <div className="text-xs text-zed-text-muted">
                  {selectedFile.path}
                </div>
                <Button onClick={saveFile} disabled={saving} size="sm">
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              className="h-96 w-full rounded-md border border-zed-border bg-zed-element px-3 py-2 text-sm text-zed-text font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
              placeholder="Edit the prompt file content..."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};