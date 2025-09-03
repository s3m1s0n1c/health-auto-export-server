import mongoose, { Schema, Document } from 'mongoose';

/*
 * This file defines the TypeScript interfaces and Mongoose schema for workout
 * documents stored in MongoDB.  A workout document represents a single
 * workout session exported from Apple Health or another source.  Each
 * workout includes mandatory metadata such as start/end time and duration
 * as well as a number of optional metrics (distance, energy, heart‑rate
 * series, etc.).
 *
 * The modifications below extend the interface and schema to support
 * additional metrics requested by the API consumer.  New fields include
 * totalEnergy, maxHeartRate, avgHeartRate, stepCadence, totalSwimmingStrokeCount,
 * swimCadence, speed, flightsClimbed and elevation.  Where appropriate
 * these fields reuse the existing QuantityMetricSchema for consistency.
 */

interface IQuantityMetric {
  qty: number;
  date: Date;
  units: string;
  source: string;
}

interface IMeasurement {
  qty: number;
  units: string;
  date: Date;
  source: string;
}

interface IHeartRate extends IMeasurement {
  Min: number;
  Avg: number;
  Max: number;
  date: Date;
  units: string;
  source: string;
}

interface ILocation {
  latitude: number;
  longitude: number;
  course: number;
  courseAccuracy: number;
  speed: number;
  speedAccuracy: number;
  altitude: number;
  verticalAccuracy: number;
  horizontalAccuracy: number;
  timestamp: Date;
}

interface IRoute {
  workoutId: string;
  locations: ILocation[];
}

export interface WorkoutData {
  id: string;
  name: string;
  start: Date;
  end: Date;
  duration: number;
  // --- Optional fields ---
  distance?: IMeasurement;
  activeEnergyBurned?: IMeasurement;
  activeEnergy?: IQuantityMetric;
  heartRateData?: IHeartRate[];
  heartRateRecovery?: IHeartRate[];
  stepCount?: IQuantityMetric[];
  temperature?: IMeasurement;
  humidity?: IMeasurement;
  intensity?: IMeasurement;
  route?: ILocation[];
  /**
   * Total energy burned during the workout.  Represented as a quantity
   * metric because it includes a numeric value, units and timestamp.
   */
  totalEnergy?: IQuantityMetric;
  /**
   * Maximum heart‑rate observed during the workout.  Provided as a single
   * number (beats per minute).  This supplements the heartRateData array.
   */
  maxHeartRate?: number;
  /**
   * Average heart‑rate for the workout (beats per minute).  This is
   * calculated client‑side or provided by the exporter.
   */
  avgHeartRate?: number;
  /**
   * Step cadence (steps per minute).  Stored as a QuantityMetric because it
   * includes units and timestamp information.
   */
  stepCadence?: IQuantityMetric;
  /**
   * Total swimming stroke count for swim workouts.  Represented as a
   * QuantityMetric for consistency with other count‑based metrics.
   */
  totalSwimmingStrokeCount?: IQuantityMetric;
  /**
   * Swimming cadence (strokes per minute).  Again represented using
   * QuantityMetric.
   */
  swimCadence?: IQuantityMetric;
  /**
   * Average speed across the workout (e.g. metres per second or km/h).
   */
  speed?: IQuantityMetric;
  /**
   * Flights of stairs climbed.  Stored as a QuantityMetric.
   */
  flightsClimbed?: IQuantityMetric;
  /**
   * Elevation gain or altitude metric.  Stored as a QuantityMetric.
   */
  elevation?: IQuantityMetric;
}

interface IWorkout extends Document, Omit<WorkoutData, 'id' | 'route'> {
  workoutId: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuantityMetricSchema = new Schema<IQuantityMetric>(
  {
    qty: { type: Number, required: true, min: 0 },
    units: { type: String, required: true },
    date: { type: Date, required: true },
    source: { type: String, required: true },
  },
  { _id: false },
);

const HeartRateSchema = new Schema<IHeartRate>(
  {
    Min: { type: Number, required: true, min: 0 },
    Avg: { type: Number, required: true, min: 0 },
    Max: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    units: { type: String, required: true },
    source: { type: String, required: true },
  },
  { _id: false },
);

const WorkoutSchema = new Schema(
  {
    workoutId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    start: {
      type: Date,
      required: true,
    },
    end: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    // --- Optional fields ---
    activeEnergyBurned: {
      type: QuantityMetricSchema,
      required: true,
    },
    distance: {
      type: QuantityMetricSchema,
      required: false,
      min: 0,
    },
    activeEnergy: {
      type: QuantityMetricSchema,
      required: false,
    },
    heartRateData: {
      type: [HeartRateSchema],
      required: false,
    },
    heartRateRecovery: {
      type: [HeartRateSchema],
      required: false,
    },
    stepCount: {
      type: [QuantityMetricSchema],
      required: false,
    },
    temperature: {
      type: QuantityMetricSchema,
      required: false,
    },
    humidity: {
      type: QuantityMetricSchema,
      required: false,
    },
    intensity: {
      type: QuantityMetricSchema,
      required: false,
    },
    // New optional fields definitions
    totalEnergy: {
      type: QuantityMetricSchema,
      required: false,
    },
    maxHeartRate: {
      type: Number,
      required: false,
    },
    avgHeartRate: {
      type: Number,
      required: false,
    },
    stepCadence: {
      type: QuantityMetricSchema,
      required: false,
    },
    totalSwimmingStrokeCount: {
      type: QuantityMetricSchema,
      required: false,
    },
    swimCadence: {
      type: QuantityMetricSchema,
      required: false,
    },
    speed: {
      type: QuantityMetricSchema,
      required: false,
    },
    flightsClimbed: {
      type: QuantityMetricSchema,
      required: false,
    },
    elevation: {
      type: QuantityMetricSchema,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

const locationSchema = new Schema<ILocation>(
  {
    // Required fields
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    timestamp: { type: Date, required: true },
    // Optional fields
    course: { type: Number, required: false },
    courseAccuracy: { type: Number, required: false },
    speed: { type: Number, required: false },
    speedAccuracy: { type: Number, required: false },
    altitude: { type: Number, required: false },
    verticalAccuracy: { type: Number, required: false },
    horizontalAccuracy: { type: Number, required: false },
  },
  { _id: false },
);

const routeSchema = new Schema<IRoute>(
  {
    workoutId: { type: String, required: true },
    locations: {
      type: [locationSchema],
      required: true,
      validate: {
        validator: function (array: ILocation[]) {
          return array.length > 0;
        },
        message: 'Locations array must contain at least one point',
      },
    },
  },
  { timestamps: true },
);

export function mapWorkoutData(data: WorkoutData) {
  const { id, ...rest } = data;

  // Convert top‑level date fields
  rest.start = new Date(rest.start);
  rest.end = new Date(rest.end);

  // Helper to convert a QuantityMetric or Measurement date
  const convertMetricDate = (metric: any) => {
    if (metric && metric.date) {
      return { ...metric, date: new Date(metric.date) };
    }
    return metric;
  };

  // Convert individual metric dates
  rest.activeEnergyBurned = convertMetricDate(rest.activeEnergyBurned);
  rest.distance = convertMetricDate(rest.distance);
  rest.activeEnergy = convertMetricDate(rest.activeEnergy);
  rest.totalEnergy = convertMetricDate((rest as any).totalEnergy);
  (rest as any).stepCadence = convertMetricDate((rest as any).stepCadence);
  (rest as any).totalSwimmingStrokeCount = convertMetricDate((rest as any).totalSwimmingStrokeCount);
  (rest as any).swimCadence = convertMetricDate((rest as any).swimCadence);
  (rest as any).speed = convertMetricDate((rest as any).speed);
  (rest as any).flightsClimbed = convertMetricDate((rest as any).flightsClimbed);
  rest.temperature = convertMetricDate(rest.temperature);
  rest.humidity = convertMetricDate(rest.humidity);
  rest.intensity = convertMetricDate(rest.intensity);
  (rest as any).elevation = convertMetricDate((rest as any).elevation);

  // Convert arrays of metrics (stepCount, heartRateData, heartRateRecovery)
  if (Array.isArray(rest.stepCount)) {
    rest.stepCount = rest.stepCount.map((metric) => convertMetricDate(metric));
  }
  if (Array.isArray(rest.heartRateData)) {
    rest.heartRateData = rest.heartRateData.map((hr) => ({
      ...hr,
      date: new Date((hr as any).date),
    }));
  }
  if (Array.isArray(rest.heartRateRecovery)) {
    rest.heartRateRecovery = rest.heartRateRecovery.map((hr) => ({
      ...hr,
      date: new Date((hr as any).date),
    }));
  }

  // Compute maxHeartRate and avgHeartRate if not provided
  const hrData = rest.heartRateData as any[];
  if (!(rest as any).maxHeartRate && Array.isArray(hrData) && hrData.length > 0) {
    (rest as any).maxHeartRate = Math.max(...hrData.map((hr) => hr.Max));
  }
  if (!(rest as any).avgHeartRate && Array.isArray(hrData) && hrData.length > 0) {
    const avg = hrData.reduce((sum, hr) => sum + hr.Avg, 0) / hrData.length;
    (rest as any).avgHeartRate = Number(avg.toFixed(2));
  }

  return {
    workoutId: id,
    ...rest,
  };
}

export function mapRoute(data: WorkoutData) {
  return {
    workoutId: data.id,
    locations: data.route?.map((loc) => ({
      ...loc,
      timestamp: new Date(loc.timestamp),
    })),
  };
}

export const WorkoutModel = mongoose.model<IWorkout>('Workout', WorkoutSchema, 'workouts');
export const RouteModel = mongoose.model<IRoute>('Route', routeSchema, 'workout_routes');
