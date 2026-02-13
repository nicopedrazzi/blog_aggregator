import { eq } from "drizzle-orm";
import { db } from "./db";
import { feedFollows, feeds, users } from "./db/schema";
import { AppConfig, readAppConfig, writeAppConfig } from "./lib/appConfig";
import { UserRecord } from "./db/queries/rssFunctions";


export type Config = AppConfig;

export type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

export type CommandsRegistry = Record<string ,CommandHandler>;



export function parseDuration(durationStr: string): number{
    const regex = /^(\d+)(ms|s|m|h)$/;
    const match = durationStr.match(regex);
    if (!match) {
        throw new Error("Invalid duration. Use formats like 500ms, 1s, 1m, 1h.");
    }
    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
        ms: 1,
        s: 1000,
        m: 60_000,
        h: 3_600_000,
    };
    return value * multipliers[unit];
};

export type UserCommandHandler = (
  cmdName: string,
  user: UserRecord,
  ...args: string[]
) => Promise<void>;

export type MiddlewareLoggedIn = (handler: UserCommandHandler) => CommandHandler;

export const middlewareLoggedIn: MiddlewareLoggedIn = (handler) => {
  return async (cmdName: string, ...args: string[]) => {
    const userName = validateConfig().currentUserName;
    const rows = await db.select().from(users).where(eq(users.name, userName));
    if (rows.length === 0) {
      throw new Error(`User ${userName} not found`);
    }
    const user = rows[0];
    return handler(cmdName, user, ...args);
  };
};



export async function GetFeedFollowsForUser(_cmdName: string, ...args: string[]){
    if (args.length !== 1) {
        throw new Error("Expected a single feed name");
    }
    const currentUserName = validateConfig().currentUserName;
    const foundFeed = await db.select().from(feeds).where(eq(feeds.name,args[0]));
    for (let feed of foundFeed){
        console.log(`${currentUserName} follows ${feed.name}`);
    };
};

export function registerCommand(registry: CommandsRegistry, cmdName: string, handler: CommandHandler){
    registry[cmdName] = handler;
}

export async function runCommand(registry: CommandsRegistry, cmdName: string, ...args: string[]){
    if (!registry[cmdName]){
        console.log("Undefined command");
        process.exit(1);
    };
    await registry[cmdName](cmdName, ...args);
}

export function validateConfig(){
    const config= readConfig();
    return {dbUrl:config.dbUrl, currentUserName:config.currentUserName};
}

export function setUser(username:string):void{
    const currentConfig = validateConfig();
    currentConfig.currentUserName = username;
    writeAppConfig(currentConfig);
};

export function readConfig(){
    return readAppConfig();
};
