import { Router } from "express";
import { createBot, outputMedia, stopMedia } from "../services/recallService";

const router = Router();

router.post("/create-bot", async (req, res) => {
    try {
        const { meeting_url, bot_name } = req.body as { meeting_url: string; bot_name?: string };
        if (!meeting_url) return res.status(400).json({ error: "meeting_url requerido" });

        const result = await createBot(meeting_url, bot_name);
        res.json(result);
    } catch (err: any) {
        console.error("Error create-bot:", err?.response?.data || err);
        res.status(500).json({ error: err?.response?.data ?? err.message ?? "Internal error" });
    }
});

router.post("/output-media", async (req, res) => {
    try {
        const { bot_id, url } = req.body as { bot_id: string; url: string };
        if (!bot_id || !url) return res.status(400).json({ error: "bot_id y url requeridos" });

        const result = await outputMedia(bot_id, url);
        res.json(result);
    } catch (err: any) {
        console.error("Error output-media:", err?.response?.data || err);
        res.status(500).json({ error: err?.response?.data ?? err.message ?? "Internal error" });
    }
});

router.delete("/output-media", async (req, res) => {
    try {
        const bot_id = String(req.query.bot_id || "");
        if (!bot_id) return res.status(400).json({ error: "bot_id requerido" });

        const result = await stopMedia(bot_id);
        res.json(result);
    } catch (err: any) {
        console.error("Error stop-media:", err?.response?.data || err);
        res.status(500).json({ error: err?.response?.data ?? err.message ?? "Internal error" });
    }
});

export default router;
