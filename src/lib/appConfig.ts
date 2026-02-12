import fs from "fs";
import os from "os";
import path from "path";

export type AppConfig = {
  dbUrl: string;
  currentUserName: string;
};

function getConfigFilePath(): string {
  return path.join(os.homedir(), ".gatorconfig.json");
}

export function readAppConfig(): AppConfig {
  const raw = JSON.parse(fs.readFileSync(getConfigFilePath(), "utf-8"));
  return {
    dbUrl: raw.dbUrl ?? raw.db_url ?? "",
    currentUserName: raw.currentUserName ?? "",
  };
}

export function writeAppConfig(config: AppConfig): void {
  fs.writeFileSync(getConfigFilePath(), JSON.stringify(config));
}
