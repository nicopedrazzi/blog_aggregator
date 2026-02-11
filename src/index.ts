import { setUser, readConfig } from "../config.js";


function main() {
  setUser("Nico");
  const config = readConfig();
  console.log(config);
}

main();