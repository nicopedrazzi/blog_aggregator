import fs from "fs";
import os from "os";
import path from "path";

export type Config = {
    dbUrl:string;
    currentUserName:string;
};

function getConfigFilePath(){
    const homeDir= os.homedir();
    return path.join(homeDir,"Desktop/Dev/BlogAggregator/.gatorconfig.json");
};

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
