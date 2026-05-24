"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  AI_INTERFACES_CHANGE_EVENT,
  AI_INTERFACES_DEFAULT_ENABLED,
  readAiInterfacesEnabled,
  resetAiInterfacesOverride,
  writeAiInterfacesEnabled,
} from "@/config/aiLaunch";

function subscribe(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(AI_INTERFACES_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(AI_INTERFACES_CHANGE_EVENT, callback);
  };
}

export function useAiLaunchSettings() {
  const aiInterfacesEnabled = useSyncExternalStore(
    subscribe,
    readAiInterfacesEnabled,
    () => AI_INTERFACES_DEFAULT_ENABLED
  );

  const setAiInterfacesEnabled = useCallback((enabled) => {
    writeAiInterfacesEnabled(Boolean(enabled));
  }, []);

  const resetAiInterfaces = useCallback(() => {
    resetAiInterfacesOverride();
  }, []);

  return {
    aiInterfacesEnabled,
    setAiInterfacesEnabled,
    resetAiInterfaces,
  };
}
