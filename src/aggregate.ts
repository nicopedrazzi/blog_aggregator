import { db } from "./db";
import { feeds } from "./db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { fetchFeed } from "./rssFunctions";
import { createPost } from "./post";

export async function markFeedFetched(id: string) {
  await db
    .update(feeds)
    .set({
      last_fetched_at: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(feeds.id, id));
};

export async function getNextFeedToFetch() {
  const [nextFeed] = await db
    .select()
    .from(feeds)
    .orderBy(sql`${feeds.last_fetched_at} asc nulls first`)
    .limit(1);

  return nextFeed ?? null;
}

export async function scrapeFeed(){
    const nextToFetch = await getNextFeedToFetch();
    if (!nextToFetch) {
        return;
    }
    await markFeedFetched(nextToFetch.id);
    const fetchedItems = await fetchFeed(nextToFetch.url);
    for (let item of fetchedItems.items){
        await createPost({
      title: item.title,
      url: item.link,
      description: item.description,
      publishedAt: new Date(item.pubDate),
      feedId: nextToFetch.id,
    });
    }
}

export async function scrapeFeeds(){
    await scrapeFeed();
}
