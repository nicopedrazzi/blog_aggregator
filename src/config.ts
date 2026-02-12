import fs from "fs";
import os from "os";
import path from "path";
import { eq } from "drizzle-orm";
import { createUser , getUsers} from "./db/queries/users";
import { db } from "./db";
import { users } from "./db/schema";
import { fetchFeed } from "./rssFunctions";


export type Config = {
    dbUrl:string;
    currentUserName:string;
};

export type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

export type CommandsRegistry = Record<string ,CommandHandler>;

function getConfigFilePath(){
    const homeDir= os.homedir();
    return path.join(homeDir, ".gatorconfig.json");
};

export async function handlerLogin(_cmdName: string, ...args: string[]){
    if (args.length !== 1){
        console.log("Unexpected args length, please give ONE username");
        process.exit(1);
    };
    const existing = await db.select().from(users).where(eq(users.name, args[0]));
    if (existing.length === 0) {
        throw new Error("User not found!")
    };
    setUser(args[0])
    console.log("User sucessfully logged in!")

    };


export async function fetchFeedObj(_cmdName:string,...args:string[]):Promise<void>{
    if (args.length !== 1){
        console.log("Unexpected args length, please give ONE url");
        process.exit(1);
        
    };
    console.log(await fetchFeed(args[0]));
};

export async function registerHandler(_cmdName: string, ...args:string[]){
    if (args.length !== 1){
        console.log("Unexpected args length, please give ONE name");
        process.exit(1);
        
    };
    try {
        const result = await createUser(args[0]);
        console.log(result)
    } catch (error){
            throw error;
        };
    setUser(args[0]);
    console.log("User successfully registered!")
}

export async function getUsersAndCurrent(...args:string[]){
    const users = await getUsers();
    for (let user of users){
        if (user.name===validateConfig().currentUserName){
            console.log(`* ${user.name} (current)`);
            continue;
        };
        console.log(`* ${user.name}`);
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



function writeConfig(config:string):void{
    fs.writeFileSync(getConfigFilePath(), config);
};

function validateConfig(){
    const config= readConfig();
    return {dbUrl:config.dbUrl, currentUserName:config.currentUserName};
}

export function setUser(username:string):void{
    const currentConfig = validateConfig();
    currentConfig.currentUserName = username;
    writeConfig(JSON.stringify(currentConfig));
};

export function readConfig(){
    const configFile = getConfigFilePath();
    return JSON.parse(fs.readFileSync(configFile, "utf-8"));
};
