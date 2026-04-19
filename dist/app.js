import express from "express";
import AdminJS from "adminjs";
import { buildAuthenticatedRouter } from "@adminjs/express";
import provider from "./admin/auth-provider.js";
import options from "./admin/options.js";
import dotenv from "dotenv";
import { connectDB } from "./db/mongoose.js";
import helmet from "helmet";
import MongoStore from "connect-mongo";
import { MONGO_URI, PORT } from "./config.js";
// Routes
import whatsappRoutes from "./routes/whatsapp.routes.js";
import whatsappFlowRouter from "./routes/whatsapp.flow.routes.js";
import taxpayerRoutes from "./routes/taxpayer.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import serviceRequestRoutes from "./routes/serviceRequest.routes.js";
import healthRoutes from "./routes/health.routes.js";
dotenv.config();
const start = async () => {
    try {
        const app = express();
        const admin = new AdminJS(options);
        if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging") {
            app.set("trust proxy", 1);
        }
        const sessionOptions = {
            secret: process.env.COOKIE_SECRET || "taxchat-secret-key",
            name: "adminjs",
            store: MongoStore.create({
                mongoUrl: MONGO_URI,
                collectionName: "admin_sessions",
                ttl: 14 * 24 * 60 * 60,
            }),
            saveUninitialized: true,
            resave: true,
            proxy: true,
            cookie: {
                secure: process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging",
                httpOnly: true,
                sameSite: "lax",
            },
        };
        const router = buildAuthenticatedRouter(admin, {
            cookiePassword: process.env.COOKIE_SECRET || "taxchat-secret-key",
            cookieName: "adminjs",
            provider,
        }, null, sessionOptions);
        app.use(admin.options.rootPath, router);
        if (process.env.NODE_ENV === "production") {
            await admin.initialize();
        }
        else {
            admin.watch();
        }
        app.use(helmet());
        // Parse JSON with raw body preserved for webhook signature verification
        app.use(express.json({
            verify: (req, res, buf) => {
                req.rawBody = buf;
            },
        }));
        app.use(express.urlencoded({ extended: true }));
        // Health check
        app.use("/health", healthRoutes);
        // Root
        app.get("/", (req, res) => {
            return res.status(200).send("NRS TaxChat API");
        });
        // WhatsApp webhook
        app.use("/webhook", whatsappRoutes);
        // WhatsApp flows
        app.use("/flow", whatsappFlowRouter);
        // API routes
        app.use("/api/taxpayers", taxpayerRoutes);
        app.use("/api/notifications", notificationRoutes);
        app.use("/api/service-requests", serviceRequestRoutes);
        // Connect to database
        await connectDB();
        app.listen(PORT, () => {
            console.log(`NRS TaxChat server is running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error("Failed to start server:", error);
    }
};
start();
