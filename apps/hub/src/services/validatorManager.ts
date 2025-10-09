


const { prisma } = require("db/client");
import { WebSocket } from "ws";
import { v7 as uuidv7 } from "uuid";
import { SignupIncomingMessage } from "common/types";
import { getGeoLocation } from "./geoLocation";

export interface Validator {
  validatorId: string;
  publicKey: string;
  socket: WebSocket;
  location: {
    ip: string,
    country: string,
    countryCode: string,
    region: string,
    regionCode: string,
    city: string | null,
    postalCode: string | null,
    continent: string,
    continentCode: string,
    latitude: number,
    longitude: number,
    timezoneAbbreviation: string | null,
    flag: string | null,
  }
}

export const validators: Validator[] = [];

export function removeValidator(socket: WebSocket) {
  const index = validators.findIndex((v) => v.socket === socket);
  if (index !== -1) {
    validators.splice(index, 1);
  }
}

export async function handleSignup(message: SignupIncomingMessage, socket: WebSocket) {
  try {
    let validator = await prisma.user.findFirst({
      where: {
        walletAddress: message.walletAddress.toLowerCase(),
      },
      include: {
        geoLocation: true,
      },
    });

    if (!validator) {
      const geoLocation = await getGeoLocation(message.ip);
      const newGeoLocation = await prisma.geoLocation.create({
        data: {
          ip: message.ip,
          country: geoLocation.country.toLowerCase(),
          countryCode: geoLocation.country_code,
          region: geoLocation.region,
          regionCode: geoLocation.region_iso_code,
          city: geoLocation.city?.toLowerCase() || null,
          postalCode: geoLocation.postal_code,
          continent: geoLocation.continent.toLowerCase(),
          continentCode: geoLocation.continent_code,
          latitude: geoLocation.latitude,
          longitude: geoLocation.longitude,
          timezoneAbbreviation: geoLocation.timezone.abbreviation || null,
          flag: geoLocation.flag.svg || null,
          updatedAt: new Date(),
        },
      });
      const newValidator = await prisma.user.create({
        data: {
          publicKey: message.publicKey,
          walletAddress: message.walletAddress.toLowerCase(),
          geoLocationId: newGeoLocation.id,
        },
      });

      socket.send(
        JSON.stringify({
          type: "signup",
          data: {
            validatorId: newValidator.id,
            callbackId: uuidv7(),
          },
        })
      );
      validators.push({
        validatorId: newValidator.id,
        publicKey: newValidator.publicKey,
        socket: socket,
        location: {
          ip: message.ip,
          country: geoLocation.country,
          countryCode: geoLocation.country_code,
          region: geoLocation.region,
          regionCode: geoLocation.region_iso_code,
          city: geoLocation.city?.toLowerCase() || null,
          postalCode: geoLocation.postal_code || null,
          continent: geoLocation.continent,
          continentCode: geoLocation.continent_code,
          latitude: geoLocation.latitude,
          longitude: geoLocation.longitude,
          timezoneAbbreviation: geoLocation.timezone.abbreviation || null,
          flag: geoLocation.flag.svg || null,
        }
      });
      return;
    }
    const hasIpChanged = validator?.geoLocation?.ip !== message.ip;
    if (hasIpChanged) {
      const oldGeoLocationId = validator.geoLocationId;
      const geoLocation = await getGeoLocation(message.ip);
      const newGeoLocation = await prisma.geoLocation.create({
        data: {
          ip: message.ip,
          country: geoLocation.country?.toLowerCase() || null,
          countryCode: geoLocation.country_code,
          region: geoLocation.region,
          regionCode: geoLocation.region_iso_code,
          city: geoLocation.city?.toLowerCase() || null,
          postalCode: geoLocation.postal_code,
          continent: geoLocation.continent?.toLowerCase() || null,
          continentCode: geoLocation.continent_code,
          latitude: geoLocation.latitude,
          longitude: geoLocation.longitude,
          timezoneAbbreviation: geoLocation.timezone.abbreviation || null,
          flag: geoLocation.flag.svg || null,
          updatedAt: new Date(),
        },
      });
      await prisma.user.update({
        where: {
          id: validator.id,
        },
        data: {
          geoLocationId: newGeoLocation.id,
        },
      });
      if(oldGeoLocationId) {
        await prisma.geoLocation.delete({
          where: {
            id: oldGeoLocationId,
          },
        });
      }
    }

    socket.send(
      JSON.stringify({
        type: "signup",
        data: {
          validatorId: validator.id,
          callbackId: uuidv7(),
        },
      })
    );
    validators.push({
      validatorId: validator.id,
      publicKey: validator.publicKey,
      socket: socket,
      location: {
        ip: message.ip,
        country: validator.geoLocation.country,
        countryCode: validator.geoLocation.countryCode,
        region: validator.geoLocation.region,
        regionCode: validator.geoLocation.regionCode,
        city: validator.geoLocation.city,
        postalCode: validator.geoLocation.postalCode,
        continent: validator.geoLocation.continent,
        continentCode: validator.geoLocation.continentCode,
        latitude: validator.geoLocation.latitude,
        longitude: validator.geoLocation.longitude,
        timezoneAbbreviation: validator.geoLocation.timezoneAbbreviation,
        flag: validator.geoLocation.flag,
      }
    });
  } catch (error) {
    console.error(error);
    socket.send(
      JSON.stringify({
        type: "error",
        data: { message: "Internal server error" },
      })
    );
  }
}