import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import { readAppConfig } from "../lib/appConfig";

const config = readAppConfig();
const conn = postgres(config.dbUrl);
export const db = drizzle(conn, { schema });
