ALTER TABLE "feeds" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "last_fetched_at" timestamp DEFAULT now();