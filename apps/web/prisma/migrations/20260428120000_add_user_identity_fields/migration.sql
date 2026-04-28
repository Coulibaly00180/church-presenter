-- Ajout de firstName, lastName (optionnels d'abord, puis backfill, puis NOT NULL)
ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName"  TEXT;
ALTER TABLE "User" ADD COLUMN "username"  TEXT;

-- Backfill : extraire prénom/nom depuis name, username = première partie avant espace (minuscule)
UPDATE "User"
SET
  "firstName" = SPLIT_PART("name", ' ', 1),
  "lastName"  = CASE
                  WHEN POSITION(' ' IN "name") > 0
                  THEN TRIM(SUBSTRING("name" FROM POSITION(' ' IN "name") + 1))
                  ELSE ''
                END,
  "username"  = LOWER(REPLACE(SPLIT_PART("name", ' ', 1), '''', '')) || '_' || LEFT(id, 6);

-- Passer en NOT NULL avec valeur par défaut vide pour les futurs inserts
ALTER TABLE "User" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "firstName" SET DEFAULT '';
ALTER TABLE "User" ALTER COLUMN "lastName"  SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "lastName"  SET DEFAULT '';
ALTER TABLE "User" ALTER COLUMN "username"  SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "username"  SET DEFAULT '';

-- Index unique sur username
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
