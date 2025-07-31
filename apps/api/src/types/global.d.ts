import * as express from "express";

declare global {
  namespace Express {
    export interface Request {
      user: {
        id?: string;
      };
    }
  }
}

// declare namespace Express{
//   export interface Request{
//     user:{
//       id?: string
//     }
//   }
// }

export {}