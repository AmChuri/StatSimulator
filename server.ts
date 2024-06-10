import { faker } from '@faker-js/faker';
import cors from 'cors';
import { endOfDay, parseISO, startOfDay } from 'date-fns';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { MongoClient } from 'mongodb';
import cron from 'node-cron';

interface SystemMetrics {
  timestamp: Date;
  cpuUsage: number;
  ramUsage: number;
  temperature: number;
  storageUsage: number;
}

const app = express();

app.use(cors());
dotenv.config();
const port = process.env.PORT || 8080;
let latestMetrics: SystemMetrics | null = null;

async function connectToDatabase(uri: string) {
  const client = new MongoClient(uri);
  await client.connect();
  console.log('Connected to MongoDB Atlas');
  return client;
}

function generateRandomMetrics(): SystemMetrics {
  return {
    timestamp: new Date(),
    cpuUsage: faker.number.float({
      min: 0,
      max: 100,
      multipleOf: 0.1,
    }),
    ramUsage: faker.number.float({
      min: 0,
      max: 100,
      multipleOf: 0.1,
    }),
    temperature: faker.number.float({
      min: 20,
      max: 35,
      multipleOf: 0.1,
    }),
    storageUsage: faker.number.float({
      min: 0,
      max: 100,
      multipleOf: 0.1,
    }),
  };
}

async function saveMetrics(
  client: MongoClient,
  dbName: string,
  collectionName: string,
  metrics: SystemMetrics
) {
  const db = client.db(dbName);
  const collection = db.collection(collectionName);
  await collection.insertOne(metrics);
  console.log('Metrics saved:', metrics);
}

app.get('/api/cpu', (req, res) => {
  if (latestMetrics) {
    res.json(latestMetrics);
  } else {
    res.status(404).send('No data available');
  }
});

app.get('/api/data', async (req: Request, res: Response) => {
  console.log('hit data');
  const uri = process.env.ATLAS ?? '';
  console.log(uri);
  const dbName = 'systemMetrics';
  const collectionName = 'metrics';

  const client = await connectToDatabase(uri);
  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  let { startdate, enddate } = req.query;
  let startDate = new Date();
  let endDate = new Date();

  if (startdate) {
    startDate = startOfDay(parseISO(startdate as string));
  } else {
    startDate = startOfDay(new Date());
  }

  if (enddate) {
    endDate = endOfDay(parseISO(enddate as string));
  } else {
    endDate = endOfDay(startDate);
  }

  const data = await collection
    .find({
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    })
    .sort({ timestamp: 1 })
    .toArray();

  res.json(data);
});

cron.schedule('* * * * *', async () => {
  console.log(
    'Task is running every minute:',
    new Date().toISOString()
  );
  const uri = process.env.ATLAS ?? '';
  const dbName = 'systemMetrics';
  const collectionName = 'metrics';
  console.log(uri);
  const client = await connectToDatabase(uri);
  const metrics = generateRandomMetrics();
  latestMetrics = metrics; // Update the latest metrics
  await saveMetrics(client, dbName, collectionName, metrics);
});

// async function main() {
//   const uri = process.env.ATLAS ?? '';
//   const dbName = 'systemMetrics';
//   const collectionName = 'metrics';
//   console.log(uri);
//   const client = await connectToDatabase(uri);

//   // Simulate data every second
//   setInterval(async () => {
//     const metrics = generateRandomMetrics();
//     latestMetrics = metrics; // Update the latest metrics
//     await saveMetrics(client, dbName, collectionName, metrics);
//   }, 60000);

//   // Start the Express server
// }

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
// main().catch(console.error);
