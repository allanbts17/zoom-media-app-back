/* eslint-disable */
import { Router } from "express";
import { createBot, outputMedia, stopMedia } from "../services/recallService";

const router = Router();

// Crear bot y unirlo a la reunión
router.post("/create-bot", async (req, res): Promise<void> => {
  try {
    const { meeting_url, bot_name } = req.body as { meeting_url?: string; bot_name?: string };

    if (!meeting_url || typeof meeting_url !== "string") {
      return void res.status(400).json({ error: "meeting_url requerido" });
    }

    const result = await createBot(meeting_url, bot_name);
    return void res.json(result);
  } catch (err: any) {
    console.error("Error create-bot:", err?.response?.data || err);
    return void res
      .status(500)
      .json({ error: err?.response?.data ?? err?.message ?? "Internal error" });
  }
});

// Enviar media (MP4 público) al bot
router.post("/output-media", async (req, res): Promise<void> => {
  try {
    const { bot_id, url } = req.body as { bot_id?: string; url?: string };

    if (!bot_id || typeof bot_id !== "string" || !url || typeof url !== "string") {
      return void res.status(400).json({ error: "bot_id y url requeridos" });
    }

    const result = await outputMedia(bot_id, url);
    return void res.json(result);
  } catch (err: any) {
    console.error("Error output-media:", err?.response?.data || err);
    return void res
      .status(500)
      .json({ error: err?.response?.data ?? err?.message ?? "Internal error" });
  }
});

// Detener media actual
router.delete("/output-media", async (req, res): Promise<void> => {
  try {
    const bot_id = (req.query?.bot_id as string) || "";

    if (!bot_id) {
      return void res.status(400).json({ error: "bot_id requerido" });
    }

    const result = await stopMedia(bot_id);
    return void res.json(result);
  } catch (err: any) {
    console.error("Error stop-media:", err?.response?.data || err);
    return void res
      .status(500)
      .json({ error: err?.response?.data ?? err?.message ?? "Internal error" });
  }
});

export default router;
