import { and, eq, ilike, or } from "drizzle-orm";
import { createUser , getUsers} from "./db/queries/users";
import { db } from "./db";
import { feedFollows, feeds, users } from "./db/schema";
import { setUser, validateConfig, parseDuration } from "./helperFunctions";
import { UserRecord, createFeedFollow, createFeeds, deleteFollowing, printFeed } from "./db/queries/rssFunctions";
import { scrapeFeeds } from "./db/queries/aggregate";
import { posts } from "./db/schema";


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
};

export async function deleteAll(){
    const promise = await db.delete(users);
    if(promise){
        console.log("Successfully deleted the DB!");
        process.exit(0);
    };
    process.exit(1);
};

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
};

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

export async function deleteHandler(_cmdName: string, user: UserRecord, ...args: string[]){
    await deleteFollowing(user.name, args[0]);
};

export async function getPostForUser(_cmdName: string, user: UserRecord, ...args: string[]) {
    if (args.length > 3){
        throw new Error("Usage: browse [offset] [filter <text>]");
    }

    let offset = 0;
    let filterText: string | undefined;

    if (args[0] === "filter") {
        if (!args[1] || args.length > 2) {
            throw new Error("Usage: browse [offset] [filter <text>]");
        }
        filterText = args[1];
    } else if (args[0] !== undefined) {
        const parsedOffset = Number(args[0]);
        if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
            throw new Error("offset must be a non-negative integer");
        }
        offset = parsedOffset;
        if (args[1] !== undefined || args[2] !== undefined) {
            if (args[1] !== "filter" || !args[2]) {
                throw new Error("Usage: browse [offset] [filter <text>]");
            }
            filterText = args[2];
        }
    }

    let whereClause = eq(feeds.userId, user.id);
    if (filterText) {
        const term = `%${filterText}%`;
        whereClause = and(
            eq(feeds.userId, user.id),
            or(
                ilike(posts.title, term),
                ilike(posts.description, term),
                ilike(feeds.name, term),
            ),
        )!;
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
        .where(whereClause)
        .orderBy(posts.createdAt)
        .limit(10)
        .offset(offset);

    for (const post of retrievedPosts) {
        console.log("------------------------------------------------------------------");
        console.log(`| Post: ${post.title} -- From (${post.feedName})`);
        console.log(`| Post Url: ${post.url}`);
        console.log("------------------------------------------------------------------");
    }
};
