-- Remove the free-trial credit grant: new accounts now start with 0 credits.
ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 0;
