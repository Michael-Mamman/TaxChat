import { Router } from "express";
import { sendNotification, scheduleNotification, getNotificationHistory } from "../controller/notification.controller.js";
const router = Router();
router.post("/send", sendNotification);
router.post("/schedule", scheduleNotification);
router.get("/history/:phone", getNotificationHistory);
export default router;
