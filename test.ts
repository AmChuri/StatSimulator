import { MongoClient } from 'mongodb';

const removeDuplicates = async () => {
  const uri = process.env.ATLAS ?? '';
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = 'systemMetrics';
  const collectionName = 'metrics';
  try {
    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    // Aggregation pipeline to keep only one entry for each truncated timestamp
    const pipeline = [
      {
        $project: {
          timestamp: {
            $dateToString: {
              format: '%Y-%m-%dT%H:%M:%S', // Truncate timestamp to seconds
              date: '$timestamp',
            },
          },
          document: '$$ROOT',
        },
      },
      {
        $group: {
          _id: '$timestamp',
          document: { $first: '$document' },
        },
      },
      {
        $replaceRoot: { newRoot: '$document' },
      },
    ];

    // Execute the aggregation pipeline to remove duplicates
    const result = await collection.aggregate(pipeline).toArray();

    // Delete all documents from the collection
    await collection.deleteMany({});

    // Insert the deduplicated documents back into the collection
    await collection.insertMany(result);

    console.log('Duplicates removed successfully.');
  } finally {
    await client.close();
  }
};
