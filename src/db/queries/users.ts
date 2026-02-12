import { db } from "..";
import { users } from "../schema";

export async function createUser(name: string) {
  const [result] = await db.insert(users).values({ name: name }).returning();
  return result;
};

export async function deleteAll(){
    const promise = await db.delete(users);
    if(promise){
        console.log("Successfully deleted the DB!");
        process.exit(0);
    };
    process.exit(1);
};

export async function getUsers(){
    const promise = await db.select({name: users.name}).from(users);
    if (promise){
    return promise};
    throw new Error("Empty DB");
};