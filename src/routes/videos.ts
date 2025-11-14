/* eslint-disable */
import { Router } from "express";
import { listVideos, 
  // getMulter, uploadVideo, 
  getUploadUrl } from "../services/gcsService";

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

// router.post("/upload", (req, res, next) => {
//   console.log('=== REQUEST DEBUG ===');
//   console.log('Content-Type:', req.headers['content-type']);
//   console.log('Content-Length:', req.headers['content-length']);
//   console.log('Method:', req.method);
//   console.log('URL:', req.url);
//   console.log('Headers:', JSON.stringify(req.headers, null, 2));
//   next();
// },getMulter().single('video'), async (req, res) => {
//   try {
//     console.log("hola mundo")
//     console.log("Received file upload:", req.file);
//     if (!req.file) {
//       res.status(400).json({
//         error: 'No se proporcionó ningún archivo'
//       });
//     } else {
//       const result = await uploadVideo(req.file);

//       res.json({
//         message: 'Video uploaded successfully',
//         data: result
//       });
//     }

//   } catch (err: any) {
//     console.error("Error /api/videos/upload:", err);
//     res.status(500).json({ error: err.message ?? "Internal error" });
//   }
// });

export default router;
