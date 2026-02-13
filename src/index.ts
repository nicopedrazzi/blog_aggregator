import { spawn, ChildProcess } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { CommandsRegistry, middlewareLoggedIn, registerCommand, runCommand } from "./helperFunctions.js";
import {
  addFeedCommand,
  deleteHandler,
  Feed,
  FeedFollowCommand,
  getCurrentUserFollowsCommand,
  getPostForUser,
  getUsersAndCurrent,
  handlerLogin,
  registerHandler,
} from "./handlersFunctions.js";
import { deleteAll } from "./db/queries/users.js";

const registry: CommandsRegistry = {};

function registerAllCommands() {
  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", registerHandler);
  registerCommand(registry, "reset", deleteAll);
  registerCommand(registry, "users", getUsersAndCurrent);
  registerCommand(registry, "addfeed", middlewareLoggedIn(addFeedCommand));
  registerCommand(registry, "feeds", Feed);
  registerCommand(registry, "follow", middlewareLoggedIn(FeedFollowCommand));
  registerCommand(registry, "following", middlewareLoggedIn(getCurrentUserFollowsCommand));
  registerCommand(registry, "unfollow", middlewareLoggedIn(deleteHandler));
  registerCommand(registry, "browse", middlewareLoggedIn(getPostForUser));
}

async function main() {
  registerAllCommands();

  const rl = createInterface({ input, output });
  let aggProcess: ChildProcess | null = null;

  while (true) {
    const line = await rl.question("Command > ");
    const parts = line.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      continue;
    }

    const command = parts[0];
    const args = parts.slice(1);

    if (command === "q" || command === "quit" || command === "exit") {
      if (aggProcess) {
        aggProcess.kill("SIGINT");
      }
      break;
    }

    if (command === "agg") {
      if (aggProcess && !aggProcess.killed) {
        console.log("Aggregator already running. Use agg-stop first.");
        continue;
      }

      aggProcess = spawn("npx", ["tsx", "./src/aggWorker.ts", ...args], {
        stdio: "inherit",
      });

      aggProcess.on("exit", () => {
        aggProcess = null;
      });

      console.log("Aggregator started in background process.");
      continue;
    }

    if (command === "agg-stop") {
      if (!aggProcess) {
        console.log("Aggregator is not running.");
        continue;
      }
      aggProcess.kill("SIGINT");
      aggProcess = null;
      console.log("Aggregator stop signal sent.");
      continue;
    }

    if (command === "agg-status") {
      console.log(aggProcess ? "Aggregator is running." : "Aggregator is not running.");
      continue;
    }

    try {
      if (command !== "browse") {
        await runCommand(registry, command, ...args);
        continue;
      }

      await runCommand(registry, "browse", ...args);

      let offset = Number(args[0]);
      const hasOffset = Number.isInteger(offset) && offset >= 0;
      if (!hasOffset) {
        offset = 0;
      }
      const tailArgs = hasOffset ? args.slice(1) : args;

      while (true) {
        const answer = await rl.question("Press Enter for next page, q to stop paging: ");
        if (answer.trim().toLowerCase() === "q") {
          break;
        }
        if (answer.trim() !== "") {
          continue;
        }
        offset += 10;
        await runCommand(registry, "browse", String(offset), ...tailArgs);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error(error);
      }
    }
  }

  rl.close();
}

main();
