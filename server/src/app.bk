import cors from 'cors';
import express from 'express';

import mongodb from './database/mongodb';
import ingesterRouter from './routes/ingester';
import metricsRouter from './routes/metrics';
import workoutsRouter from './routes/workouts';

const app = express();
const port = 3001;

mongodb.connect();

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

app.use('/api/data', ingesterRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/workouts', workoutsRouter);

app.get('/', (req: express.Request, res: express.Response) => {
  res.json({ message: 'Hello world!' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
