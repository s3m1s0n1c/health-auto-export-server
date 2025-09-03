import { Request, Response } from 'express';

import { saveMetrics } from './metrics';
import { saveWorkouts } from './workouts';
import { IngestData } from '../models/IngestData';
import { IngestResponse } from '../models/IngestResponse';
import dotenv from 'dotenv';

// Load environment variables.  Even though other modules may already call
// dotenv.config(), calling it again here is harmless and ensures that
// process.env.DEBUG is populated before we read it.
dotenv.config();

/**
 * Controller that handles ingestion of metrics and workouts.  When the
 * DEBUG environment variable is set to 'true', detailed logs will be
 * printed to aid debugging.  Otherwise, ingestion proceeds quietly.
 */
export const ingestData = async (req: Request, res: Response) => {
  let response: IngestResponse = {};
  try {
    const data = req.body as IngestData;

    if (!data) {
      throw new Error('No data provided');
    }

    // If DEBUG=true, log the incoming payload (may be large)
    if (process.env.DEBUG === 'true') {
      console.debug('Received ingest request body:', JSON.stringify(data, null, 2));
    }

    const [metricsResponse, workoutsResponse] = await Promise.all([
      saveMetrics(data),
      saveWorkouts(data),
    ]);

    // Merge responses from both save operations
    response = { ...metricsResponse, ...workoutsResponse };

    // If DEBUG=true, log the individual responses
    if (process.env.DEBUG === 'true') {
      console.debug('Metrics save response:', JSON.stringify(metricsResponse, null, 2));
      console.debug('Workouts save response:', JSON.stringify(workoutsResponse, null, 2));
    }

    const hasErrors = Object.values(response).some((r: any) => !r.success);
    const allFailed = Object.values(response).every((r: any) => !r.success);

    if (allFailed) {
      res.status(500).json(response);
      return;
    }

    res.status(hasErrors ? 207 : 200).json(response);
  } catch (error: any) {
    console.error('Error processing request:', error);
    res.status(500).json({
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};
