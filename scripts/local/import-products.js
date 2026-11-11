const fs = require("fs");

const products = JSON.parse(
  fs.readFileSync("/tmp/products-import.json", "utf8")
);

const collection = db.getCollection("products");

print("Products in source:", products.length);
print("Existing products:", collection.countDocuments({}));

let inserted = 0;
let skipped = 0;

for (const product of products) {
  const result = collection.updateOne(
    { originalId: product.originalId },
    {
      $setOnInsert: {
        ...product,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );

  if (result.upsertedCount === 1) {
    inserted++;
  } else {
    skipped++;
  }
}

print("Inserted:", inserted);
print("Already existing:", skipped);
print("Final product count:", collection.countDocuments({}));
print("Books:", collection.countDocuments({
  shop_category: "books"
}));
