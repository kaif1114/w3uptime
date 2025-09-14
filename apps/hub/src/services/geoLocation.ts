import "dotenv/config";

interface GeoLocationSecurity {
  is_vpn: boolean;
}

interface GeoLocationTimezone {
  name: string;
  abbreviation: string;
  gmt_offset: number;
  current_time: string;
  is_dst: boolean;
}

interface GeoLocationFlag {
  emoji: string;
  unicode: string;
  png: string;
  svg: string;
}

interface GeoLocationCurrency {
  currency_name: string;
  currency_code: string;
}

interface GeoLocationConnection {
  autonomous_system_number: number;
  autonomous_system_organization: string;
  connection_type: string | null;
  isp_name: string | null;
  organization_name: string | null;
}

interface GeoLocation {
  ip_address: string;
  city: string | null;
  city_geoname_id: number | null;
  region: string;
  region_iso_code: string;
  region_geoname_id: number;
  postal_code: string | null;
  country: string;
  country_code: string;
  country_geoname_id: number;
  country_is_eu: boolean;
  continent: string;
  continent_code: string;
  continent_geoname_id: number;
  longitude: number;
  latitude: number;
  security: GeoLocationSecurity;
  timezone: GeoLocationTimezone;
  flag: GeoLocationFlag;
  currency: GeoLocationCurrency;
  connection: GeoLocationConnection;
}

export async function getGeoLocation(ip: string): Promise<GeoLocation> {
  const response = await fetch(
    `https://ipgeolocation.abstractapi.com/v1/?api_key=${process.env.ABSTRACTAPI_KEY}&ip_address=${ip}`
  );
  const data = await response.json() as GeoLocation;
  return data;
}