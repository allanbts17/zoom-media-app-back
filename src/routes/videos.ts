/* eslint-disable */
import { Router } from "express";
import { listVideos, getUploadUrl, deleteVideo, getVideoUrlById } from "../services/gcsService";

const router = Router();

export type VideoItem = {
  videoPath: string;
  thumbnailPath: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
};

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
      return void res.status(400).json({ error: "filename query param required" });
    }

    const url = await getUploadUrl(filename);
    res.json({ uploadUrl: url });
  } catch (err: any) {
    console.error("Error /api/videos/upload-url:", err);
    res.status(500).json({ error: err.message ?? "Internal error" });
  }
});

router.post("/delete", async (req, res) => {
  try {
    const video = req.body.videoData as VideoItem;
    await deleteVideo(video);
    res.json({ message: `Deleted video ${video.videoPath}` });
  } catch (err: any) {
    console.error("Error POST /api/videos/delete", err);
    res.status(500).json({ error: err.message ?? "Internal error" });
  }
});

router.get("/play/:id", (req, res) => {
  const id = req.params.id;
  const videoUrl = getVideoUrlById(id);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Player</title>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            background: #000;
            overflow: hidden;
          }
          video {
            width: 100vw;
            height: 100vh;
            object-fit: cover; /* 🔥 Hace que llene la pantalla */
            background: #000;
          }
        </style>
      </head>
      <body>
        <video src="${videoUrl}" autoplay></video>
      </body>
    </html>
    `;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
})

router.get("/tube/:id", (req, res) => {
  const id = req.params.id;
  //const videoUrl = getVideoUrlById(id);

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video de YouTube Embebido</title>
    <style>
        /* Hacemos que el video sea responsivo */
        .video-container {
            position: relative;
            padding-bottom: 56.25%; /* Relación 16:9 */
            height: 0;
            overflow: hidden;
            max-width: 100%;
            background: #000;
        }
        .video-container iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: 0;
        }
    </style>
</head>
<body>

    <h1>Ejemplo de Video de YouTube Embebido</h1>

    <div class="video-container">
        <iframe 
            src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1" 
            title="Reproductor de YouTube"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen>
        </iframe>
    </div>

</body>
</html>

    `;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
})

export default router;
