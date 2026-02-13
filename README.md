# BlogAggregator

Local CLI RSS feed aggregator with a REPL CLI, PostgreSQL, and Drizzle ORM.

## What It Does

- Manages users (`register`, `login`, `users`)
- Stores feeds and follow relationships (`addfeed`, `feeds`, `follow`, `following`, `unfollow`)
- Aggregates posts into your database in the background (`agg`)
- Browses posts with pagination and optional text filtering (`browse`)

## Requirements

- Node.js 18+
- PostgreSQL

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `~/.gatorconfig.json` with your DB URL in your home directory, leave the current user alone:

```json
{
  "dbUrl": "postgres://USER:PASSWORD@localhost:5432/DB_NAME",
  "currentUserName": ""
}
```

3. Run migrations:

```bash
npm run generate
npm run migrate
```

4. Start the app (REPL mode):

```bash
npm run start
```

You will see a prompt like:

```text
Command >
```

## Command Reference

### Auth and Users

- `register <username>`
  - Creates a user and sets it as current user.

- `login <username>`
  - Sets an existing user as current user.

- `users`
  - Lists all users and marks the current one.

- `reset`
  - Deletes all users from DB (destructive).

### Feeds and Follows

- `addfeed <feed_name> <feed_url>`
  - Creates a feed and follows it as current user.
  - Requires logged-in user.

- `feeds`
  - Lists all feeds with owner.

- `follow <feed_url>`
  - Follows an existing feed by URL.
  - If feed does not exist yet, it is created first.
  - Requires logged-in user.

- `following`
  - Lists feeds followed by current user.
  - Requires logged-in user.

- `unfollow <feed_url>`
  - Unfollows a feed URL for current user.
  - Requires logged-in user.

### Aggregation (Background)

These commands are handled by the REPL process manager.

- `agg <duration>`
  - Starts background aggregation process, that fetches every `duration` from the RSS feed.
  - Duration examples: `500ms`, `10s`, `1m`, `1h`.
  - While running, you can continue using other commands.

- `agg-status`
  - Shows whether background aggregator is running.

- `agg-stop`
  - Stops background aggregator process.

Notes:
- Starting `agg` while already running will be rejected.
- Exiting the REPL also sends a stop signal to the aggregator.

### Browse Posts

- `browse`
  - Shows first page (10 posts).

- `browse <offset>`
  - Shows 10 posts starting at offset.
  - Example: `browse 20`.

- `browse filter <text>`
  - First page with filter.
  - Filter matches post title, post description, and feed name.

- `browse <offset> filter <text>`
  - Offset + filter together.
  - Example: `browse 30 filter apple`.

Pagination behavior:
- After any `browse` command, prompt switches to paging mode:
  - Press `Enter` for next page (`offset + 10`)
  - Type `q` to stop paging and return to `Command >`

## REPL Exit

- `q`
- `quit`
- `exit`

## Typical Session

```text
Command > register CEO
Command > addfeed HackerNews https://news.ycombinator.com/rss
Command > agg 30s
Command > browse filter typescript
Press Enter for next page, q to stop paging:
Command > agg-status
Command > agg-stop
Command > exit
```
