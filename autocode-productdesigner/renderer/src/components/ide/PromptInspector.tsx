import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import type { PromptBuildResult, PromptBuildOptions, PromptVariableTrace } from "@/types/ipc";

type ViewMode = "template" | "variables" | "steps" | "final";

export const PromptInspector = () => {
  const [options, setOptions] = useState<PromptBuildOptions>({});
  const [customVarName, setCustomVarName] = useState("");
  const [customVarValue, setCustomVarValue] = useState("");
  const [result, setResult] = useState<PromptBuildResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("final");
  const { showToast } = useToast();

  const buildPrompt = async () => {
    setLoading(true);
    try {
      const data = await window.ide.buildPrompt(options);
      setResult(data);
      showToast("Prompt built successfully", "success");
    } catch (error) {
      showToast("Failed to build prompt", "error");
    } finally {
      setLoading(false);
    }
  };

  const addCustomVariable = () => {
    if (customVarName.trim() && customVarValue.trim()) {
      setOptions(prev => ({
        ...prev,
        variables: {
          ...prev.variables,
          [customVarName.trim()]: customVarValue.trim()
        }
      }));
      setCustomVarName("");
      setCustomVarValue("");
    }
  };

  const removeCustomVariable = (name: string) => {
    setOptions(prev => {
      const newVars = { ...prev.variables };
      delete newVars[name];
      return {
        ...prev,
        variables: newVars
      };
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied to clipboard", "success");
    } catch (error) {
      showToast("Failed to copy", "error");
    }
  };

  const renderVariableTrace = (trace: PromptVariableTrace[]) => {
    return (
      <div className="space-y-3">
        {trace.map((item, idx) => (
          <div key={idx} className="rounded border border-zed-border-alt bg-zed-element p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-zed-text">
                {item.var}
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="mb-1 text-xs text-zed-text-muted">Before:</div>
                <code className="block rounded bg-zed-element px-2 py-1 text-xs text-zed-text-muted">
                  {item.before}
                </code>
              </div>
              <div>
                <div className="mb-1 text-xs text-zed-text-muted">After:</div>
                <code className="block rounded bg-zed-element px-2 py-1 text-xs text-zed-text">
                  {item.after}
                </code>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSteps = () => {
    if (!result) return null;

    return (
      <div className="space-y-4">
        {result.steps.map((step, idx) => (
          <div key={idx} className="rounded border border-zed-border-alt bg-zed-element p-4">
            <div className="mb-3 text-sm font-semibold text-zed-text">
              {step.name}
            </div>
            {step.trace && step.trace.length > 0 && (
              <div className="mb-3">
                <div className="mb-2 text-xs text-zed-text-muted">Variables:</div>
                {renderVariableTrace(step.trace)}
              </div>
            )}
            <div>
              <div className="mb-2 text-xs text-zed-text-muted">Content preview:</div>
              <pre className="max-h-40 overflow-auto rounded bg-zed-element px-3 py-2 text-xs text-zed-text">
                {step.content.slice(0, 500)}
                {step.content.length > 500 && "..."}
              </pre>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zed-border-alt px-4 py-3">
        <div className="text-[11px] uppercase tracking-wide text-zed-text-muted">Prompt Inspector</div>
        <div className="mt-1 text-xs text-zed-text">
          {result ? "Prompt loaded" : "Build a prompt to inspect it"}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Build Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-zed-text-muted">
              Build and inspect the current prompt configuration with custom variables.
            </div>

            <div>
              <Label className="text-zed-text-muted">Custom Variables</Label>
              <div className="mt-2 space-y-2">
                {Object.entries(options.variables || {}).map(([name, value]) => (
                  <div key={name} className="flex items-center gap-2">
                    <Input
                      value={name}
                      disabled
                      className="w-32"
                    />
                    <span className="text-zed-text-muted">=</span>
                    <Input
                      value={value}
                      disabled
                      className="flex-1"
                    />
                    <Button
                      onClick={() => removeCustomVariable(name)}
                      variant="destructive"
                      size="sm"
                    >
                      Remove
                    </Button>
                  </div>
                ))}

                <div className="flex items-center gap-2">
                  <Input
                    value={customVarName}
                    onChange={(e) => setCustomVarName(e.target.value)}
                    placeholder="Variable name"
                    className="w-32"
                  />
                  <span className="text-zed-text-muted">=</span>
                  <Input
                    value={customVarValue}
                    onChange={(e) => setCustomVarValue(e.target.value)}
                    placeholder="Variable value"
                    className="flex-1"
                  />
                  <Button onClick={addCustomVariable} size="sm">
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <Button onClick={buildPrompt} disabled={loading} className="w-full">
              {loading ? "Building..." : "Build Prompt"}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>View</CardTitle>
                  <div className="flex gap-1">
                    {(["template", "variables", "steps", "final"] as ViewMode[]).map(mode => (
                      <Button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        variant={viewMode === mode ? "default" : "outline"}
                        size="sm"
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {viewMode === "template" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-zed-text-muted">Raw Template</Label>
                      <Button
                        onClick={() => copyToClipboard(result.template)}
                        size="sm"
                      >
                        Copy
                      </Button>
                    </div>
                    <pre className="max-h-96 overflow-auto rounded bg-zed-element px-3 py-2 text-xs text-zed-text font-mono">
                      {result.template}
                    </pre>
                  </div>
                )}

                {viewMode === "variables" && (
                  <div className="space-y-3">
                    <Label className="text-zed-text-muted">Variable Expansion Trace</Label>
                    {result.variables.length === 0 ? (
                      <div className="text-sm text-zed-text-muted">No variables expanded</div>
                    ) : (
                      renderVariableTrace(result.variables)
                    )}
                  </div>
                )}

                {viewMode === "steps" && (
                  <div className="space-y-3">
                    <Label className="text-zed-text-muted">Build Steps</Label>
                    {renderSteps()}
                  </div>
                )}

                {viewMode === "final" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-zed-text-muted">Final Prompt Payload</Label>
                      <Button
                        onClick={() => copyToClipboard(result.systemPrompt)}
                        size="sm"
                      >
                        Copy
                      </Button>
                    </div>
                    <pre className="max-h-96 overflow-auto rounded bg-zed-element px-3 py-2 text-xs text-zed-text font-mono">
                      {result.systemPrompt}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};