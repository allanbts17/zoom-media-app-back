/* eslint-disable */
import { Router } from "express";
import { listVideos, getUploadUrl, deleteVideo } from "../services/gcsService";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const videos = await listVideos();
    res.json(videos);
  } catch (err: any) {
    console.error("Error /api/videos:", err);
    res.status(500).json({ error: err.message ?? "Internal error" });
  }
});

router.post("/upload-url", async (req, res) => {
  try {

    const filename = req.body.filename as string;
    console.log("Filename for upload URL:", req.body);
    console.log("Filename for upload URL:", filename);
    if (!filename) {
      return void res.status(400).json({error: "filename query param required"});
    }

    const url = await getUploadUrl(filename);
    res.json({uploadUrl: url});
  } catch (err: any) {
    console.error("Error /api/videos/upload-url:", err);
    res.status(500).json({error: err.message ?? "Internal error"});
  }
});

  router.delete("/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      await deleteVideo(filename);
      res.json({message: `Deleted video ${filename}`});
    } catch (err: any) {
      console.error("Error DELETE /api/videos/:filename:", err);
      res.status(500).json({error: err.message ?? "Internal error"});
    }
  });

export default router;
