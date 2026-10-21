import {FieldValue} from "firebase-admin/firestore";
import {Router as createRouter} from "express";
import {Storage} from "@google-cloud/storage";
import {db} from "..";
import {audioContentType, validateAudioPath} from "../services/audioFiles";

const router = createRouter();
const storage = new Storage();
const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Internal error";

router.post("/upload-url", async (req, res) => {
  let contentType: string;
  try {
    contentType = audioContentType(req.body.filename);
  } catch (error: unknown) {
    res.status(400).json({error: errorMessage(error)});
    return;
  }
  try {
    const bucketName = process.env.GCS_BUCKET;
    if (!bucketName) throw new Error("GCS_BUCKET no configurado");
    const file = storage.bucket(bucketName).file("audios/" + req.body.filename);
    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 5 * 60 * 1000,
      contentType,
    });
    res.json({uploadUrl});
  } catch (error: unknown) {
    res.status(500).json({error: errorMessage(error)});
  }
});

router.post("/delete", async (req, res) => {
  let audioPath: string;
  try {
    audioPath = validateAudioPath(req.body.audioPath);
  } catch (error: unknown) {
    res.status(400).json({error: errorMessage(error)});
    return;
  }
  try {
    const bucketName = process.env.GCS_BUCKET;
    if (!bucketName) throw new Error("GCS_BUCKET no configurado");
    await storage.bucket(bucketName).file(audioPath).delete({
      ignoreNotFound: true,
    });
    const docs = await db.collection("audios")
      .where("audioPath", "==", audioPath).get();
    const lists = await db.collection("lists")
      .where("audioPaths", "array-contains", audioPath).get();
    for (const doc of docs.docs) await doc.ref.delete();
    for (const doc of lists.docs) {
      await doc.ref.update({audioPaths: FieldValue.arrayRemove(audioPath)});
    }
    res.json({ok: true});
  } catch (error: unknown) {
    res.status(500).json({error: errorMessage(error)});
  }
});

export default router;
