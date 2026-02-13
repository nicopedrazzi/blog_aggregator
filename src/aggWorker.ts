import { fetchFeedObj } from "./handlersFunctions.js";

async function main() {
  const args = process.argv.slice(2);
  try {
    await fetchFeedObj("agg", ...args);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
