import { Request, Response, NextFunction } from "express";

async function authMiddleware(req: Request, res: Response, next: NextFunction) {

    //for now hardcoding the user and id but when we proceed further our auth system will intercept the request here and set the user id
    req.user = req.user || {};
    req.user.id = "06933e3d-30cc-4659-8976-2f61a0390edf";
    next();
}

export default authMiddleware;