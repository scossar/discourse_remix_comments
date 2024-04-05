-- CreateTable
CREATE TABLE "DiscourseTopic" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "fancy_title" TEXT NOT NULL,
    "archetype" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DiscoursePost" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "topicId" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "avatar_template" TEXT NOT NULL,
    "post_number" INTEGER NOT NULL,
    "post_type" INTEGER NOT NULL,
    "cooked" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "DiscoursePost_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "DiscourseTopic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
