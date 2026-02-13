import { XMLParser } from "fast-xml-parser";
import { db } from "../index";
import { feedFollows, feeds, users } from "../schema";
import { validateConfig } from "../../helperFunctions";
import { eq, and } from "drizzle-orm";


type FeedItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

type Feed = {
  title: string;
  description: string;
  link: string;
  items: FeedItem[];
};


const xmlParser = new XMLParser;

export async function fetchFeed(feedURL: string):Promise<Feed>{
    let response = await fetch(feedURL, {
        "method":"GET",
        "headers":{
            "User-Agent":"Gator",
        },
    });
    if (!response.ok){throw new Error()};
    const parsedObject = xmlParser.parse(await response.text());
    if (!parsedObject.rss.channel){
        throw new Error("No channel field!");
    }
    const channelField = parsedObject.rss.channel;
    
    if (!channelField.title){
        throw new Error("Field title is missing!");
    }
    else if (!channelField.link){
        throw new Error("Field link is missing!");
    }
    else if (!channelField.description){
        throw new Error("Field description is missing!");
    };

    let returnedItems:any = [];

    if (channelField.item){
        const items:FeedItem = channelField.item;
        if (Array.isArray(items)){
            returnedItems = [...items];
        };
    };
    const itemsMetadata: FeedItem[] = [];
    for (let item of returnedItems){
        if (!item.title){
            continue;
    }
    else if (!item.link){
        continue;
    }
    else if (!item.description){
        continue;
    }
    else if (!item.pubDate){
        continue;
    };
    let newArray = [item.title,item.link,item.description,item.pubDate];
    itemsMetadata.push({
    title: item.title,
    link: item.link,
    description: item.description,
    pubDate: item.pubDate,
    });
    };
    return {
        title: channelField.title,
        description: channelField.description,
        link: channelField.link,
        items: itemsMetadata,
    };
    };

 
export async function createFeeds(name:string, feedURL:string){
    let currentUser = validateConfig().currentUserName;
    const currentIDrow = await db
        .select({id: users.id})
        .from(users)
        .where(eq(users.name,currentUser));
    if (currentIDrow.length === 0) {
        throw new Error("Current user not found");
    }
    const currentID = currentIDrow[0].id;
    const [result] = await db.insert(feeds).values({name: name,url: feedURL, userId:currentID}).returning();
    await createFeedFollow(currentID, result.id);
    return result;
    
};


export type FeedRecord = typeof feeds.$inferSelect;
export type UserRecord = typeof users.$inferSelect;

export function printFeed(feed: FeedRecord, user: UserRecord): void {
    console.log(`* ${feed.name}`);
    console.log(`  URL: ${feed.url}`);
    console.log(`  User: ${user.name}`);
}

export async function createFeedFollow(userId:string,feedId:string){
    const [newFeedFollow] = await db.insert(feedFollows).values({userId,feedId}).returning();
    const fetchedInfo = await db.select({
      id: feedFollows.id,
      createdAt: feedFollows.createdAt,
      updatedAt: feedFollows.updatedAt,
      userId: feedFollows.userId,
      feedId: feedFollows.feedId,
      userName: users.name,
      feedName: feeds.name,
    }).from(feedFollows).innerJoin(users,eq(feedFollows.userId,users.id))
    .innerJoin(feeds,eq(feedFollows.feedId,feeds.id))
    .where(eq(feedFollows.id,newFeedFollow.id));

    if (fetchedInfo.length === 0){
        throw new Error("Failed to load created feed follow");
    };
    return fetchedInfo[0];
};

export async function deleteFollowing(name:string, feedURL:string){
    const feedid = await db.select().from(feeds).where(eq(feeds.url, feedURL));
    const userid = await db.select().from(users).where(eq(users.name, name));
    await db
  .delete(feedFollows)
  .where(
    and(
      eq(feedFollows.feedId, feedid[0].id),
      eq(feedFollows.userId, userid[0].id)
    ),
  );
  console.log("Follow deleted!")
}
