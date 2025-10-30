import express from "express";
import cors from "cors";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config();

import videosRouter from "./routes/videos";
import recallRouter from "./routes/recall";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/videos", videosRouter);
app.use("/api/recall", recallRouter);

// Salud
app.get("/api/health", (_req, res) => res.json({ ok: true }));

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
    console.log(`✅ API corriendo en http://localhost:${PORT}`);
    console.log(`ENV:`, {
        GCS_BUCKET: process.env.GCS_BUCKET,
        PUBLIC_PREFIX: process.env.PUBLIC_PREFIX,
        RECALL_BASE: process.env.RECALL_BASE
    });
});
