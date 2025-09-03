import AdmZip from 'adm-zip';
// import { XMLParser } from 'fast-xml-parser';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

interface BaseMetric {
  qty: number;
  units: string;
  date: string;
  source: string;
  metadata?: Record<string, string>;
}

interface MetricData {
  name: string;
  units: string;
  data: BaseMetric[];
}

interface QuantityMeasurement {
  qty: number;
  units: string;
  date: string;
  source: string;
}

interface WorkoutData {
  id: string;
  name: string;
  start: string;
  end: string;
  duration: number;
  distance?: QuantityMeasurement;
  activeEnergyBurned?: QuantityMeasurement;
}

/**
 * Transform an Apple Health type string into a lower-case metric name
 * compatible with the server's MetricName enum.
 */
function transformType(type: string): string {
  let cleaned = type.replace(/^HKQuantityTypeIdentifier/, '')
                    .replace(/^HKCategoryTypeIdentifier/, '')
                    .replace(/^HKDataTypeIdentifier/, '');
  cleaned = cleaned.replace(/([a-z])([A-Z])/g, '$1_$2');
  return cleaned.toLowerCase();
}

async function parseExport(filePath: string): Promise<{ metrics: MetricData[]; workouts: WorkoutData[]; }> {
  // Determine whether the path is an unzipped directory or a ZIP file
  let exportPath: string | null = null;
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    function findXml(dir: string): string | null {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isFile() && item.name.toLowerCase() === 'export.xml') {
          return fullPath;
        } else if (item.isDirectory()) {
          const result = findXml(fullPath);
          if (result) return result;
        }
      }
      return null;
    }
    exportPath = findXml(filePath);
    if (!exportPath) throw new Error('export.xml not found in provided directory');
  } else {
    const zip = new AdmZip(filePath);
    const tmpDir = path.join('/tmp', 'health_export_' + Date.now());
    zip.extractAllTo(tmpDir, true);
    function findExportXml(dir: string): string | null {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isFile() && item.name.toLowerCase() === 'export.xml') {
          return fullPath;
        } else if (item.isDirectory()) {
          const result = findExportXml(fullPath);
          if (result) return result;
        }
      }
      return null;
    }
    exportPath = findExportXml(tmpDir);
    if (!exportPath) throw new Error('export.xml not found after extracting zip');
  }

  const metricsMap: Map<string, MetricData> = new Map();
  const workouts: WorkoutData[] = [];

  function parseAttributes(tag: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const attrRegex = /([\w:]+)="([^"]*)"/g;
    let match: RegExpExecArray | null;
    while ((match = attrRegex.exec(tag)) !== null) {
      attrs[match[1]] = match[2];
    }
    return attrs;
  }

  const readStream = fs.createReadStream(exportPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: readStream, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = (line as string).trim();
    if (trimmed.startsWith('<Record')) {
      const attrs = parseAttributes(trimmed);
      const type = attrs['type'];
      const name = transformType(type);
      const units = attrs['unit'] || '';
      const value = attrs['value'];
      const qty = value !== undefined ? parseFloat(value) : NaN;
      const date = attrs['startDate'];
      const source = attrs['sourceName'] || 'Apple Health';
      if (!Number.isNaN(qty) && date) {
        const metric: BaseMetric = { qty, units, date, source };
        if (!metricsMap.has(name)) {
          metricsMap.set(name, { name, units, data: [] });
        }
        metricsMap.get(name)!.data.push(metric);
      }
    } else if (trimmed.startsWith('<Workout')) {
      const attrs = parseAttributes(trimmed);
      const start = attrs['startDate'];
      const end = attrs['endDate'];
      if (!start || !end || isNaN(Date.parse(start)) || isNaN(Date.parse(end))) {
        continue; // Skip invalid or incomplete workouts
      }
      const id = attrs['uuid'] || `${attrs['workoutActivityType']}_${start}`;
      const name = attrs['workoutActivityType'];
      let duration = 0;
      if (attrs['duration']) {
        const d = parseFloat(attrs['duration']);
        duration = d > 24 ? d : d * 60;
      }
      let activeEnergyBurned: QuantityMeasurement | undefined;
      let distance: QuantityMeasurement | undefined;
      if (attrs['totalEnergyBurned']) {
        const val = parseFloat(attrs['totalEnergyBurned']);
        if (!Number.isNaN(val)) {
          activeEnergyBurned = {
            qty: val,
            units: attrs['totalEnergyBurned.unit'] || '',
            date: end,
            source: attrs['sourceName'] || 'Apple Health',
          };
        }
      }
      if (attrs['totalDistance']) {
        const val = parseFloat(attrs['totalDistance']);
        if (!Number.isNaN(val)) {
          distance = {
            qty: val,
            units: attrs['totalDistance.unit'] || '',
            date: end,
            source: attrs['sourceName'] || 'Apple Health',
          };
        }
      }
      workouts.push({ id, name, start, end, duration, distance, activeEnergyBurned });
    }
  }

  const metrics: MetricData[] = Array.from(metricsMap.values());
  return { metrics, workouts };
}

async function main() {
  const filePath = process.env.EXPORT_FILE || '/data/export.zip';
  const apiUrl = process.env.API_URL || 'http://hae-server:3001/api/data';
  const apiKey = process.env.API_KEY || process.env.WRITE_TOKEN;
  if (!apiKey) {
    console.error('No API_KEY or WRITE_TOKEN provided for authentication');
    process.exit(1);
    return;
  }
  console.log(`Reading Apple Health export from ${filePath}`);
  const { metrics, workouts } = await parseExport(filePath);
  console.log(`Parsed ${metrics.length} metric categories and ${workouts.length} workouts`);

  // Post metrics in smaller chunks to avoid call stack issues
  const chunkSize = 1000;
  console.log(`Posting metrics in chunks to ${apiUrl}`);
  for (const metric of metrics) {
    const dataPoints = metric.data;
    for (let i = 0; i < dataPoints.length; i += chunkSize) {
      const chunk = dataPoints.slice(i, i + chunkSize);
      const payload = { data: { metrics: [{ name: metric.name, units: metric.units, data: chunk }], workouts: [] } };
      try {
        await axios.post(apiUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });
      } catch (err: any) {
        console.error('Failed to post metrics chunk:', err.message);
        if (err.response) {
          console.error('Response data:', err.response.data);
        }
        process.exit(1);
      }
    }
  }
  console.log('All metrics posted successfully');

  // Post workouts once
  if (workouts.length > 0) {
    const payload = { data: { metrics: [], workouts } };
    console.log(`Posting workouts to ${apiUrl}`);
    try {
      await axios.post(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      console.log('Workouts posted successfully');
    } catch (err: any) {
      console.error('Failed to post workouts:', err.message);
      if (err.response) {
        console.error('Response data:', err.response.data);
      }
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
