import type { Request, Response, NextFunction } from "express";

export default function verifySignature(
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log('[verifySignature::verifySignature] ENTER', {
    method: req.method,
    path: req.path,
    hasRawBody: Boolean((req as any).rawBody),
  });
  console.log('[verifySignature::verifySignature] branch: passing through (no-op)');
  console.log('[verifySignature::verifySignature] EXIT - calling next()');
  next();
}
