


const { prisma } = require("db/client");
import { v7 as uuidv7 } from "uuid";
import { IncomingMessage } from "common/types";
import { validators } from "./validatorManager";
import { addToBatch } from "./batchProcessor";
import { applyUptimeCheckReward, applyUptimeCheckPenalty } from "./reputation";

export const CALLBACKS: { [callbackId: string]: (message: IncomingMessage) => void } = {};

export function startMonitorDistribution() {
  setInterval(async () => {
    const monitorsToValidate = await prisma.monitor.findMany({
      where: {
        status: {
          not: "PAUSED",
          
        },
      },
    });

    for (const monitor of monitorsToValidate) {
      validators.forEach((validator) => {
        const callbackId = uuidv7();
        console.log(
          `Sending validate to ${validator.validatorId} ${monitor.url}`
        );
        validator.socket.send(
          JSON.stringify({
            type: "validate",
            data: {
              url: monitor.url,
              callbackId,
            },
          })
        );

        CALLBACKS[callbackId] = async (message: IncomingMessage) => {
          if (message.type === "validate") {
            const { validatorId, status, latency } = message.data;
            const validatorData = validators.find(v => v.validatorId === validatorId);
            
            const monitorTick = {
              monitorId: monitor.id,
              validatorId: validatorId,
              status,
              latency,
              longitude: validatorData?.location.longitude || 0,
              latitude: validatorData?.location.latitude || 0,
              countryCode: validatorData?.location.countryCode || 'UNKNOWN',
              continentCode: validatorData?.location.continentCode || 'UNKNOWN',
              city: validatorData?.location.city || 'unknown',
              createdAt: new Date(),
            };
            
            addToBatch(monitorTick);

            // Award reputation for uptime check
            // if (validatorData?.publicKey) {
            //   if (status === 'GOOD') {
            //     await applyUptimeCheckReward(validatorData.publicKey);
            //   } else if (status === 'BAD') {
            //     await applyUptimeCheckPenalty(validatorData.publicKey);
            //   }
            // } else {
            //   console.warn(`No publicKey found for validator: ${validatorId}`);
            // }
          }
        };
      });
    }
  }, 30 * 1000);
}