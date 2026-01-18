/// <reference types="vite/client" />
import type { IdeApi } from "./types/ide";

declare global {
  interface Window {
    ide: IdeApi;
  }
}

export {};
