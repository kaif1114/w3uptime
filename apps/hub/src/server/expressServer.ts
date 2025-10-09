import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import { authenticateUser } from "../services/auth";
import { validators } from "../services/validatorManager";

export function createExpressServer(): { app: express.Application, httpServer: http.Server } {
  const app = express();
  const httpServer = http.createServer(app);

  
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  
  app.get('/ping', (req, res) => {
    res.json({ status: 'OK' });
  });

  app.get('/validators', authenticateUser, (req, res) => {
    try {
      const { countrycode, city, postalcode, continent } = req.query;
      
      let filteredValidators = validators;
      
      
      if (countrycode) {
        filteredValidators = filteredValidators.filter(v => 
          v.location.countryCode.toLowerCase() === (countrycode as string).toLowerCase()
        );
      }
      
      if (city) {
        filteredValidators = filteredValidators.filter(v => 
          v.location.city?.toLowerCase() === (city as string).toLowerCase()
        );
      }
      
      if (postalcode) {
        filteredValidators = filteredValidators.filter(v => 
          v.location.postalCode === postalcode
        );
      }
      
      if (continent) {
        filteredValidators = filteredValidators.filter(v => 
          v.location.continent.toLowerCase() === (continent as string).toLowerCase()
        );
      }
      
      const responseValidators = filteredValidators.map(v => ({
        validatorId: v.validatorId,
        location: {
          country: v.location.country,
          countryCode: v.location.countryCode,
          region: v.location.region,
          city: v.location.city,
          continent: v.location.continent,
          continentCode: v.location.continentCode,
          latitude: v.location.latitude,
          longitude: v.location.longitude,
          flag: v.location.flag
        }
      }));
      
      res.json({ validators: responseValidators });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/validators/count', authenticateUser, (req, res) => {
    try {
      const validatorCount = validators.length;
      res.json({ count: validatorCount });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return { app, httpServer };
}