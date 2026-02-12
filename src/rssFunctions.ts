import {  XMLParser, XMLBuilder, XMLValidator } from "fast-xml-parser";


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
