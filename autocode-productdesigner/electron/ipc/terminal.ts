import { IpcMainEvent, IpcMainInvokeEvent } from "electron";
import { TerminalManager } from "../services/terminal";
import { WorkspaceState } from "./workspace";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

