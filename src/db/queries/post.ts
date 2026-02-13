import { posts } from "../schema";
import { db } from "../index";

export type Post = {
    title:string,
    url:string,
    description: string,
    publishedAt: Date,
    feedId: string,
};

export async function createPost(post:Post){
    await db
        .insert(posts)
        .values({
            title: post.title,
            description: post.description,
            url: post.url,
            publishedAt: post.publishedAt,
            feedId: post.feedId,
        })
        .onConflictDoNothing({ target: posts.url });
};
