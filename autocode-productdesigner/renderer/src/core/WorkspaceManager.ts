import { useCallback, useEffect, useState, useRef } from "react";
import { useToast } from "@/components/ui/toast";

export function useWorkspaceManager(
  settings: { general: { restoreWorkspace: boolean } }
) {
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [selectingWorkspace, setSelectingWorkspace] = useState(false);
  const workspaceRef = useRef<string | null>(null);
  const { showToast } = useToast();

  workspaceRef.current = workspace;

  useEffect(() => {
    let isMounted = true;
    const initWorkspace = async () => {
      try {
        if (!settings.general.restoreWorkspace) {
          return;
        }
        const existingWorkspace = await window.ide.getWorkspace();
        if (isMounted && existingWorkspace) {
          setWorkspace(existingWorkspace);
        }
      } catch (error) {
        showToast("Failed to load workspace", "error");
        console.error(error);
      }
    };
    initWorkspace();
    return () => {
      isMounted = false;
    };
  }, [showToast, settings.general.restoreWorkspace]);

  const selectWorkspace = useCallback(async () => {
    if (selectingWorkspace) {
      return null;
    }
    setSelectingWorkspace(true);
    try {
      const selected = await window.ide.selectWorkspace();
      setWorkspace(selected);
      return selected;
    } catch (error) {
      showToast("Failed to select workspace", "error");
      console.error(error);
      return null;
    } finally {
      setSelectingWorkspace(false);
    }
  }, [selectingWorkspace, showToast]);

  return {
    workspace,
    setWorkspace,
    selectingWorkspace,
    selectWorkspace,
    workspaceRef
  };
}
