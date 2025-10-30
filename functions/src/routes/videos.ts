/* eslint-disable */
import {Router} from "express";
import {listVideos} from "../services/gcsService";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const videos = await listVideos();
    res.json(videos);
  } catch (err: any) {
    console.error("Error /api/videos:", err);
    res.status(500).json({error: err.message ?? "Internal error"});
  }
});

export default router;
