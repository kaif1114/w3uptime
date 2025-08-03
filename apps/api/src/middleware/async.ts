//note: currently using express-async-errors to handle errors instead of this middleware

import { Request, Response, NextFunction } from "express";

function asyncMiddleware(handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}
export default asyncMiddleware;

