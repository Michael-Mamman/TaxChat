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
console.log('[app::module] dotenv configured');
const start = async () => {
    console.log('[app::start] ENTER', { NODE_ENV: process.env.NODE_ENV, PORT });
    try {
        console.log('[app::start] branch: try block entered');
        const app = express();
        const admin = new AdminJS(options);
        console.log('[app::start] express app + AdminJS instantiated');
        if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging") {
            console.log('[app::start] branch: production/staging env - enabling trust proxy');
            app.set("trust proxy", 1);
        }
        else {
            console.log('[app::start] branch: non-production env - trust proxy not set');
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
        console.log('[app::start] session options prepared', { secureCookie: sessionOptions.cookie.secure });
        const router = buildAuthenticatedRouter(admin, {
            cookiePassword: process.env.COOKIE_SECRET || "taxchat-secret-key",
            cookieName: "adminjs",
            provider,
        }, null, sessionOptions);
        console.log('[app::start] authenticated AdminJS router built');
        app.use(admin.options.rootPath, router);
        if (process.env.NODE_ENV === "production") {
            console.log('[app::start] branch: production - initializing AdminJS');
            await admin.initialize();
            console.log('[app::start] AdminJS initialized');
        }
        else {
            console.log('[app::start] branch: non-production - AdminJS watch mode');
            admin.watch();
        }
        app.use(helmet());
        console.log('[app::start] helmet middleware mounted');
        // Parse JSON with raw body preserved for webhook signature verification
        app.use(express.json({
            verify: (req, res, buf) => {
                console.log('[app::express.json.verify] ENTER', { bufLength: buf?.length });
                req.rawBody = buf;
                console.log('[app::express.json.verify] EXIT - rawBody attached');
            },
        }));
        app.use(express.urlencoded({ extended: true }));
        console.log('[app::start] body parsers mounted');
        // Health check
        app.use("/health", healthRoutes);
        console.log('[app::start] /health route mounted');
        // Root
        app.get("/", (req, res) => {
            console.log('[app::rootHandler] ENTER', { path: req.path });
            console.log('[app::rootHandler] EXIT - returning 200');
            return res.status(200).send("NRS TaxChat API");
        });
        // WhatsApp webhook
        app.use("/webhook", whatsappRoutes);
        console.log('[app::start] /webhook route mounted');
        // WhatsApp flows
        app.use("/flow", whatsappFlowRouter);
        console.log('[app::start] /flow route mounted');
        // API routes
        app.use("/api/taxpayers", taxpayerRoutes);
        app.use("/api/notifications", notificationRoutes);
        app.use("/api/service-requests", serviceRequestRoutes);
        console.log('[app::start] /api/* routes mounted');
        // Connect to database
        console.log('[app::start] connecting to DB...');
        await connectDB();
        console.log('[app::start] DB connected');
        app.listen(PORT, () => {
            console.log(`NRS TaxChat server is running on http://localhost:${PORT}`);
            console.log('[app::start] EXIT - server listening', { PORT });
        });
    }
    catch (error) {
        console.log('[app::start] branch: catch block - start failed');
        console.error("Failed to start server:", error);
        console.log('[app::start] EXIT - startup error');
    }
};
console.log('[app::module] invoking start()');
start();
