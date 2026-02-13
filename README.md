# BlogAggregator

BlogAggregator is a command-line RSS reader and feed tracker built with TypeScript, Drizzle ORM, and PostgreSQL.

It lets you:
- register and log in users
- add and follow RSS feeds
- continuously aggregate posts from followed feeds
- browse stored posts from your terminal

The app is designed as a small local workflow for collecting blog/news content into your own database and querying it from CLI commands.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Generate and run database migrations:
```bash
npm run generate
npm run migrate
```

3. Run commands:
```bash
npm run start register <username>
npm run start login <username>
npm run start addfeed "<feed-name>" "<feed-url>"
npm run start agg 30s
```

## Common Commands

- `register <username>`: Create a new user
- `login <username>`: Set current user
- `users`: List users and show current user
- `addfeed <name> <url>`: Add a feed for current user
- `feeds`: List all feeds
- `follow <url>`: Follow an existing feed by URL
- `following`: Show feeds followed by current user
- `unfollow <url>`: Stop following a feed
- `agg <duration>`: Continuously scrape feeds (`500ms`, `20s`, `1m`, `1h`)
- `browse [limit]`: Show latest posts for current user
