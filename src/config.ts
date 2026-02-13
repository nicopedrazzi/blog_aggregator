import { eq } from "drizzle-orm";
import { createUser , getUsers} from "./db/queries/users";
import { db } from "./db";
import { feedFollows, feeds, users } from "./db/schema";
import { createFeedFollow, createFeeds, deleteFollowing, fetchFeed, printFeed } from "./rssFunctions";
import { AppConfig, readAppConfig, writeAppConfig } from "./lib/appConfig";
import { UserRecord } from "./rssFunctions";
import { scrapeFeeds } from "./aggregate";
import { posts } from "./db/schema";


export type Config = AppConfig;

export type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

export type CommandsRegistry = Record<string ,CommandHandler>;

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


function parseDuration(durationStr: string): number{
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

export async function fetchFeedObj(_cmdName: string, ...args: string[]):Promise<void>{
    if (args.length !== 1){
        throw new Error("Expected exactly one argument: time_between_reqs");
    }
    const timeBetweenRequests = parseDuration(args[0]);
    console.log(`Collecting feeds every ${args[0]}`);

    const handleError = (err: unknown) => {
        if (err instanceof Error) {
            console.error(err.message);
            return;
        }
        console.error(err);
    };

    scrapeFeeds().catch(handleError);

    const interval = setInterval(() => {
        scrapeFeeds().catch(handleError);
    }, timeBetweenRequests);

    await new Promise<void>((resolve) => {
        process.on("SIGINT", () => {
            console.log("Shutting down feed aggregator...");
            clearInterval(interval);
            resolve();
        });
    });
};

export async function getPostForUser(_cmdName: string, user: UserRecord, ...args: string[]) {
    if (args.length > 1){
        throw new Error("Expected at most one argument: limit");
    }
    const limit = args[0] ? Number(args[0]) : 2;
    if (!Number.isInteger(limit) || limit <= 0) {
        throw new Error("limit must be a positive integer");
    }

  const retrievedPosts = await db
    .select({
      title: posts.title,
      url: posts.url,
      description: posts.description,
      publishedAt: posts.publishedAt,
      feedName: feeds.name,
    })
    .from(posts)
    .innerJoin(feeds, eq(posts.feedId, feeds.id))
    .where(eq(feeds.userId, user.id))
    .limit(limit);

  for (const post of retrievedPosts) {
    console.log(`${post.title} (${post.feedName})`);
    console.log(post.url);
  };
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




export async function registerHandler(_cmdName: string, ...args: string[]){
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

export async function deleteHandler(_cmdName: string, user: UserRecord, ...args: string[]){
    await deleteFollowing(user.name, args[0]);
}


export async function getUsersAndCurrent(_cmdName: string, ...args:string[]){
    const users = await getUsers();
    for (let user of users){
        if (user.name===validateConfig().currentUserName){
            console.log(`* ${user.name} (current)`);
            continue;
        };
        console.log(`* ${user.name}`);
    };
};

export async function addFeedCommand(_cmdName: string, user: UserRecord, ...args: string[]){
    if (args.length !==2){
        throw new Error("Not enough arguments, feed name or url missing!")
    };
    const feed = await createFeeds(args[0], args[1]);
    printFeed(feed, user);
    console.log("succesfully created field!")
};

export async function Feed(_cmdName: string){
    let results = await db.select().from(feeds);
    for (let result of results){
        let user = await db.select().from(users).where(eq(users.id, result.userId));
        console.log(result.name,result.url,user[0].name);
    };
}



export async function FeedFollowCommand(_cmdName: string, user: UserRecord, ...args: string[]){
    if (args.length !== 1) {
        throw new Error("Expected a single feed URL");
    }
    const foundFeed = await db.select().from(feeds).where(eq(feeds.url,args[0]));
    if (foundFeed.length === 0){
        await createFeeds(user.name,args[0])
        return;
    };
    await createFeedFollow(user.id,foundFeed[0].id);
    console.log(`${foundFeed[0].name} correctly followed!`);
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

export async function getCurrentUserFollowsCommand(_cmdName: string, user: UserRecord, ...args: string[]) {
    if (args.length !== 0) {
        throw new Error("This command takes no arguments");
    }
    const follows = await db
        .select({
            feedName: feeds.name,
            feedUrl: feeds.url,
        })
        .from(feedFollows)
        .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
        .where(eq(feedFollows.userId, user.id));
    for (const follow of follows) {
        console.log(`${user.name} follows ${follow.feedName} (${follow.feedUrl})`);
    }
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
