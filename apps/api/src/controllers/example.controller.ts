import { Request, Response } from "express";

export async function exampleController(req: Request, res: Response): Promise<void> {
  res.send("Hello World");
}