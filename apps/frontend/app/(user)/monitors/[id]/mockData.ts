import { subHours, subDays, subMinutes } from 'date-fns';

// Validator data interfaces
export interface ValidatorData {
  id: string;
  country: string;
  continent: string;
  city: string;
  lat: number;
  lng: number;
  latency: number;
  status: 'online' | 'offline' | 'moderate' | 'good';
  lastChecked: Date;
  ip: string;
}

// Latency chart data
export interface LatencyDataPoint {
  timestamp: Date;
  northAmerica: number;
  europe: number;
  asia: number;
  oceania: number;
  southAmerica: number;
  africa: number;
  incidents: boolean;
}

// Uptime data
export interface UptimeRecord {
  timestamp: Date;
  status: 'up' | 'down';
  latency?: number;
}

// Incident data
export interface Incident {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime?: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedRegions: string[];
  status: 'ongoing' | 'resolved';
}

// City coordinates for realistic validator locations
const CITIES = [
  // North America
  { city: 'New York', country: 'United States', continent: 'North America', lat: 40.7128, lng: -74.0060 },
  { city: 'Los Angeles', country: 'United States', continent: 'North America', lat: 34.0522, lng: -118.2437 },
  { city: 'Toronto', country: 'Canada', continent: 'North America', lat: 43.6532, lng: -79.3832 },
  { city: 'Chicago', country: 'United States', continent: 'North America', lat: 41.8781, lng: -87.6298 },
  { city: 'Mexico City', country: 'Mexico', continent: 'North America', lat: 19.4326, lng: -99.1332 },
  { city: 'Vancouver', country: 'Canada', continent: 'North America', lat: 49.2827, lng: -123.1207 },
  
  // Europe
  { city: 'London', country: 'United Kingdom', continent: 'Europe', lat: 51.5074, lng: -0.1278 },
  { city: 'Paris', country: 'France', continent: 'Europe', lat: 48.8566, lng: 2.3522 },
  { city: 'Berlin', country: 'Germany', continent: 'Europe', lat: 52.5200, lng: 13.4050 },
  { city: 'Amsterdam', country: 'Netherlands', continent: 'Europe', lat: 52.3676, lng: 4.9041 },
  { city: 'Stockholm', country: 'Sweden', continent: 'Europe', lat: 59.3293, lng: 18.0686 },
  { city: 'Madrid', country: 'Spain', continent: 'Europe', lat: 40.4168, lng: -3.7038 },
  { city: 'Rome', country: 'Italy', continent: 'Europe', lat: 41.9028, lng: 12.4964 },
  { city: 'Warsaw', country: 'Poland', continent: 'Europe', lat: 52.2297, lng: 21.0122 },
  
  // Asia
  { city: 'Tokyo', country: 'Japan', continent: 'Asia', lat: 35.6762, lng: 139.6503 },
  { city: 'Singapore', country: 'Singapore', continent: 'Asia', lat: 1.3521, lng: 103.8198 },
  { city: 'Hong Kong', country: 'Hong Kong', continent: 'Asia', lat: 22.3193, lng: 114.1694 },
  { city: 'Seoul', country: 'South Korea', continent: 'Asia', lat: 37.5665, lng: 126.9780 },
  { city: 'Mumbai', country: 'India', continent: 'Asia', lat: 19.0760, lng: 72.8777 },
  { city: 'Bangkok', country: 'Thailand', continent: 'Asia', lat: 13.7563, lng: 100.5018 },
  { city: 'Shanghai', country: 'China', continent: 'Asia', lat: 31.2304, lng: 121.4737 },
  { city: 'Delhi', country: 'India', continent: 'Asia', lat: 28.7041, lng: 77.1025 },
  
  // Oceania
  { city: 'Sydney', country: 'Australia', continent: 'Oceania', lat: -33.8688, lng: 151.2093 },
  { city: 'Melbourne', country: 'Australia', continent: 'Oceania', lat: -37.8136, lng: 144.9631 },
  { city: 'Auckland', country: 'New Zealand', continent: 'Oceania', lat: -36.8485, lng: 174.7633 },
  { city: 'Perth', country: 'Australia', continent: 'Oceania', lat: -31.9505, lng: 115.8605 },
  
  // South America
  { city: 'São Paulo', country: 'Brazil', continent: 'South America', lat: -23.5505, lng: -46.6333 },
  { city: 'Buenos Aires', country: 'Argentina', continent: 'South America', lat: -34.6037, lng: -58.3816 },
  { city: 'Lima', country: 'Peru', continent: 'South America', lat: -12.0464, lng: -77.0428 },
  { city: 'Bogotá', country: 'Colombia', continent: 'South America', lat: 4.7110, lng: -74.0721 },
  { city: 'Santiago', country: 'Chile', continent: 'South America', lat: -33.4489, lng: -70.6693 },
  
  // Africa
  { city: 'Cape Town', country: 'South Africa', continent: 'Africa', lat: -33.9249, lng: 18.4241 },
  { city: 'Lagos', country: 'Nigeria', continent: 'Africa', lat: 6.5244, lng: 3.3792 },
  { city: 'Cairo', country: 'Egypt', continent: 'Africa', lat: 30.0444, lng: 31.2357 },
  { city: 'Nairobi', country: 'Kenya', continent: 'Africa', lat: -1.2921, lng: 36.8219 },
  { city: 'Casablanca', country: 'Morocco', continent: 'Africa', lat: 33.5731, lng: -7.5898 }
];

// Generate random IP addresses
function generateRandomIP(): string {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

// Generate realistic latency based on distance and region
function generateLatencyForRegion(continent: string): number {
  const baseLatencies: Record<string, [number, number]> = {
    'North America': [50, 150],
    'Europe': [40, 120],
    'Asia': [80, 200],
    'Oceania': [100, 250],
    'South America': [120, 300],
    'Africa': [150, 400]
  };
  
  const [min, max] = baseLatencies[continent] || [50, 200];
  return Math.floor(Math.random() * (max - min) + min);
}

// Generate validator status based on latency
function generateStatus(latency: number): 'online' | 'offline' | 'moderate' | 'good' {
  if (Math.random() < 0.05) return 'offline'; // 5% offline
  if (latency < 100) return 'good';
  if (latency < 300) return 'moderate';
  return 'online';
}

// Generate mock validators
export function generateMockValidators(count: number = 95): ValidatorData[] {
  const validators: ValidatorData[] = [];
  
  for (let i = 0; i < count; i++) {
    const city = CITIES[Math.floor(Math.random() * CITIES.length)];
    const latency = generateLatencyForRegion(city.continent);
    const status = generateStatus(latency);
    
    validators.push({
      id: `validator-${i + 1}`,
      city: city.city,
      country: city.country,
      continent: city.continent,
      lat: city.lat + (Math.random() - 0.5) * 0.1, // Add small random offset
      lng: city.lng + (Math.random() - 0.5) * 0.1,
      latency,
      status,
      lastChecked: subMinutes(new Date(), Math.floor(Math.random() * 60)),
      ip: generateRandomIP()
    });
  }
  
  return validators;
}

// Generate latency chart data
export function generateLatencyChartData(hours: number = 24): LatencyDataPoint[] {
  const data: LatencyDataPoint[] = [];
  const now = new Date();
  
  for (let i = hours * 12; i >= 0; i--) { // Every 5 minutes
    const timestamp = subMinutes(now, i * 5);
    
    // Add some incidents randomly
    const hasIncident = Math.random() < 0.02; // 2% chance of incident
    
    const baseLatencies = {
      northAmerica: 80 + Math.random() * 40,
      europe: 60 + Math.random() * 30,
      asia: 100 + Math.random() * 50,
      oceania: 120 + Math.random() * 60,
      southAmerica: 140 + Math.random() * 80,
      africa: 160 + Math.random() * 100
    };
    
    // If there's an incident, increase latencies
    if (hasIncident) {
      Object.keys(baseLatencies).forEach(region => {
        const key = region as keyof typeof baseLatencies;
        baseLatencies[key] *= 1.5 + Math.random();
      });
    }
    
    data.push({
      timestamp,
      northAmerica: Math.round(baseLatencies.northAmerica),
      europe: Math.round(baseLatencies.europe),
      asia: Math.round(baseLatencies.asia),
      oceania: Math.round(baseLatencies.oceania),
      southAmerica: Math.round(baseLatencies.southAmerica),
      africa: Math.round(baseLatencies.africa),
      incidents: hasIncident
    });
  }
  
  return data;
}

// Generate uptime data
export function generateUptimeData(days: number = 30): UptimeRecord[] {
  const data: UptimeRecord[] = [];
  const now = new Date();
  
  for (let i = days * 24 * 12; i >= 0; i--) { // Every 5 minutes
    const timestamp = subMinutes(now, i * 5);
    
    // 98% uptime with occasional outages
    const isUp = Math.random() > 0.02;
    const latency = isUp ? 80 + Math.random() * 100 : undefined;
    
    data.push({
      timestamp,
      status: isUp ? 'up' : 'down',
      latency
    });
  }
  
  return data;
}

// Generate incidents
export function generateIncidents(): Incident[] {
  const incidents: Incident[] = [
    {
      id: 'incident-1',
      title: 'Database Connection Timeout',
      description: 'Multiple validators in Europe experienced database connection timeouts',
      startTime: subHours(new Date(), 6),
      endTime: subHours(new Date(), 5.5),
      severity: 'medium',
      affectedRegions: ['Europe'],
      status: 'resolved'
    },
    {
      id: 'incident-2',
      title: 'High Latency in Asia-Pacific',
      description: 'Increased response times observed across Asia-Pacific region due to network congestion',
      startTime: subDays(new Date(), 2),
      endTime: new Date(subDays(new Date(), 2).getTime() + 30 * 60 * 1000), // 30 minutes later
      severity: 'low',
      affectedRegions: ['Asia', 'Oceania'],
      status: 'resolved'
    },
    {
      id: 'incident-3',
      title: 'Partial Service Outage',
      description: 'Critical service disruption affecting North American validators',
      startTime: subDays(new Date(), 5),
      endTime: new Date(subDays(new Date(), 5).getTime() + 45 * 60 * 1000), // 45 minutes later
      severity: 'high',
      affectedRegions: ['North America'],
      status: 'resolved'
    },
    {
      id: 'incident-4',
      title: 'API Rate Limiting',
      description: 'Temporary rate limiting implemented to prevent service degradation',
      startTime: subDays(new Date(), 10),
      endTime: new Date(subDays(new Date(), 10).getTime() + 15 * 60 * 1000), // 15 minutes later
      severity: 'low',
      affectedRegions: ['Global'],
      status: 'resolved'
    },
    {
      id: 'incident-5',
      title: 'Network Infrastructure Issues',
      description: 'Ongoing network infrastructure maintenance affecting South American validators',
      startTime: subMinutes(new Date(), 30),
      severity: 'medium',
      affectedRegions: ['South America'],
      status: 'ongoing'
    }
  ];
  
  return incidents;
}

// Main data export for easy importing
export const mockData = {
  validators: generateMockValidators(),
  latencyData: generateLatencyChartData(),
  uptimeData: generateUptimeData(),
  incidents: generateIncidents()
};