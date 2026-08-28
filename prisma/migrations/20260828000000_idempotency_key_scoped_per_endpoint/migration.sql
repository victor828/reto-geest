-- DropIndex
DROP INDEX "IdempotencyKey_key_key";

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_key_method_path_key" ON "IdempotencyKey"("key", "method", "path");
