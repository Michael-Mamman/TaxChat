import type { Request, Response, NextFunction } from "express";

export default function verifySignature(
  req: Request,
  res: Response,
  next: NextFunction
) {
  next();
}
