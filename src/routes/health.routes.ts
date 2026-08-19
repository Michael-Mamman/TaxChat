import { Router } from "express";

console.log('[health.routes::module] loading health router');
const router = Router();

router.get("/", (req, res) => {
  console.log('[health.routes::GET /] ENTER', { path: req.path });
  console.log('[health.routes::GET /] EXIT - returning ok');
  return res.json({
    status: "ok",
    service: "NRS TaxChat",
    timestamp: new Date().toISOString(),
  });
});

console.log('[health.routes::module] health router ready');
export default router;
