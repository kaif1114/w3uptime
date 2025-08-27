import "dotenv/config";

export async function getGeoLocation(ip: string) {
  const response = await fetch(
    `https://ipgeolocation.abstractapi.com/v1/?api_key=${process.env.ABSTRACTAPI_KEY}&ip_address=${ip}`
  );
  const data = await response.json();
  return data;
}