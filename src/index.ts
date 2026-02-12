import { CommandsRegistry, registerCommand, runCommand, handlerLogin, registerHandler, getUsersAndCurrent, fetchFeedObj} from "./config.js";
import { deleteAll } from "./db/queries/users.js";
import { fetchFeed } from "./rssFunctions.js";

const registry:CommandsRegistry = {};


async function main() {
  registerCommand(registry,"login",handlerLogin);
  registerCommand(registry,"register",registerHandler);
  registerCommand(registry,"reset", deleteAll);
  registerCommand(registry,"users", getUsersAndCurrent);
  registerCommand(registry,"agg",fetchFeedObj);
  const args = process.argv;
  const newArgs = args.slice(2);
  if (newArgs.length === 0){
    console.log("Oh no! No args passed brudi");
    process.exit(1);
  }
  const command = newArgs[0];
  const rest = newArgs.slice(1);
  await runCommand(registry,command,...rest);
  process.exit(0);
}

main();
