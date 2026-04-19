import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  return res.json({
    status: "ok",
    service: "NRS TaxChat",
    timestamp: new Date().toISOString(),
  });
});

export default router;
