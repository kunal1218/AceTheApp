-- CreateTable
CREATE TABLE "LectureGeneralCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "topicName" TEXT NOT NULL,
    "normalizedTopic" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "styleVersion" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LectureGeneralCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LectureTieInCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "notesVersion" TEXT NOT NULL,
    "tieInVersion" TEXT NOT NULL,
    "tieInChunks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LectureTieInCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LectureUserCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "generalCacheKey" TEXT NOT NULL,
    "tieInCacheKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LectureUserCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LectureGeneralCache_cacheKey_key" ON "LectureGeneralCache"("cacheKey");

-- CreateIndex
CREATE UNIQUE INDEX "LectureTieInCache_cacheKey_key" ON "LectureTieInCache"("cacheKey");

-- CreateIndex
CREATE INDEX "LectureTieInCache_courseId_idx" ON "LectureTieInCache"("courseId");

-- CreateIndex
CREATE INDEX "LectureUserCache_userId_idx" ON "LectureUserCache"("userId");

-- CreateIndex
CREATE INDEX "LectureUserCache_courseId_idx" ON "LectureUserCache"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "LectureUserCache_userId_courseId_topicId_level_key" ON "LectureUserCache"("userId", "courseId", "topicId", "level");

-- AddForeignKey
ALTER TABLE "LectureTieInCache" ADD CONSTRAINT "LectureTieInCache_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureUserCache" ADD CONSTRAINT "LectureUserCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureUserCache" ADD CONSTRAINT "LectureUserCache_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
