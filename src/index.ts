import { CommandsRegistry, registerCommand, runCommand, middlewareLoggedIn } from "./helperFunctions.js";
import { handlerLogin, registerHandler, getUsersAndCurrent, fetchFeedObj, addFeedCommand, Feed, FeedFollowCommand, getCurrentUserFollowsCommand, deleteHandler, getPostForUser } from "./handlersFunctions.js";
import { deleteAll } from "./db/queries/users.js";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const registry:CommandsRegistry = {};


async function main() {
  registerCommand(registry,"login",handlerLogin);
  registerCommand(registry,"register",registerHandler);
  registerCommand(registry,"reset", deleteAll);
  registerCommand(registry,"users", getUsersAndCurrent);
  registerCommand(registry,"agg",fetchFeedObj);
  registerCommand(registry,"addfeed",middlewareLoggedIn(addFeedCommand));
  registerCommand(registry,"feeds",Feed);
  registerCommand(registry,"follow",middlewareLoggedIn(FeedFollowCommand));
  registerCommand(registry,"following", middlewareLoggedIn(getCurrentUserFollowsCommand));
  registerCommand(registry,"unfollow", middlewareLoggedIn(deleteHandler));
  registerCommand(registry,"browse",middlewareLoggedIn(getPostForUser));

  const args = process.argv;
  const newArgs = args.slice(2);
  if (newArgs.length === 0){
    console.log("Oh no! No args passed brudi");
    process.exit(1);
  }
  const command = newArgs[0];
  const rest = newArgs.slice(1);

  if (command !== "browse") {
    await runCommand(registry, command, ...rest);
    process.exit(0);
  }

  await runCommand(registry, "browse", ...rest);

  let offset = Number(rest[0]);
  const hasOffset = Number.isInteger(offset) && offset >= 0;
  if (!hasOffset) {
    offset = 0;
  }
  const tailArgs = hasOffset ? rest.slice(1) : rest;

  const rl = createInterface({ input, output });
  while (true) {
    const answer = await rl.question("Press Enter for next page, q to quit: ");
    if (answer.trim().toLowerCase() === "q") {
      break;
    }
    if (answer.trim() !== "") {
      continue;
    }
    offset += 5;
    await runCommand(registry, "browse", String(offset), ...tailArgs);
  }
  rl.close();
  process.exit(0);
}

main();
