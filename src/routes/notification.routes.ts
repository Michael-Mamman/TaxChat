import { Router } from "express";
import { sendNotification, scheduleNotification, getNotificationHistory } from "../controller/notification.controller.js";

console.log('[notification.routes::module] loading notification router');
const router = Router();

router.post("/send", (req, res, next) => {
  console.log('[notification.routes::POST /send] ENTER');
  return sendNotification(req, res);
});
router.post("/schedule", (req, res, next) => {
  console.log('[notification.routes::POST /schedule] ENTER');
  return scheduleNotification(req, res);
});
router.get("/history/:phone", (req, res, next) => {
  console.log('[notification.routes::GET /history/:phone] ENTER', { phone: req.params?.phone });
  return getNotificationHistory(req, res);
});

console.log('[notification.routes::module] notification router ready');
export default router;
