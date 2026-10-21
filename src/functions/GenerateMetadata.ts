import {onObjectFinalized} from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import {db} from "..";
import {audioContentType} from "../services/audioFiles";

const prefix = (process.env.PUBLIC_PREFIX || "").replace(/\/+$/, "") + "/";


/**
 * Devuelve la duración de un video en segundos
 * @param {string} filePath Ruta local del archivo de video'
 * @return {Promise<number>} Duración en segundos
 */
function getVideoDurationInSeconds(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      const duration = metadata.format?.duration ?? 0;
      resolve(duration);
    });
  });
}

export const generateVideoThumbnail = onObjectFinalized(
  {
    bucket: "zoom-app-dev.firebasestorage.app",
    memory: "512MiB",
  },
  async (event) => {
    const object = event.data;

    const bucketName = object.bucket;
    const filePath = object.name;
    const contentType = object.contentType || "";

    if (!filePath) return;
    if (filePath.startsWith("audios/")) {
      audioContentType(path.basename(filePath));
      const audioBucket = admin.storage().bucket(bucketName);
      const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "audio-"));
      const tempAudioPath = path.join(tempDirectory, path.basename(filePath));
      try {
        await audioBucket.file(filePath).download({destination: tempAudioPath});
        const duration = await getVideoDurationInSeconds(tempAudioPath);
        await db.collection("audios").doc(encodeURIComponent(filePath)).set({
          audioPath: filePath,
          audioUrl: prefix + encodeURIComponent(filePath),
          duration,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
      } finally {
        fs.rmSync(tempDirectory, {recursive: true, force: true});
      }
      return;
    }
    if (!contentType.startsWith("video/")) {
      console.log("Archivo ignorado (no es video)", filePath);
      return;
    }

    console.log("🎥 Procesando video:", filePath);

    const bucket = admin.storage().bucket(bucketName);
    const fileName = path.basename(filePath);
    const dirname = path.dirname(filePath);
    const videoId = fileName.replace(path.extname(fileName), "");

    const tempVideoPath = path.join(os.tmpdir(), fileName);
    const thumbFileName = `${videoId}.jpg`;
    const tempThumbPath = path.join(os.tmpdir(), thumbFileName);

    const thumbStoragePath =
      `thumbnails/${dirname.replace("videos/", "")}/${thumbFileName}`;

    try {
      // 1️⃣ Descargar video
      console.log("📥 Descargando video...");
      await bucket.file(filePath).download({destination: tempVideoPath});

      // Duración
      const durationSeconds = await getVideoDurationInSeconds(tempVideoPath);
      console.log("Duración del video (s):", durationSeconds);

      // 2️⃣ Thumbnail
      console.log("🖼️ Generando thumbnail...");
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .on("end", () => resolve())
          .on("error", (err) => reject(err))
          .screenshots({
            timestamps: ["1"],
            filename: thumbFileName,
            folder: os.tmpdir(),
            size: "320x?",
          });
      });

      // 3️⃣ Subir thumbnail
      console.log("📤 Subiendo thumbnail...");
      const [file] = await bucket.upload(tempThumbPath, {
        destination: thumbStoragePath,
        contentType: "image/jpeg",
        metadata: {cacheControl: "public,max-age=31536000"},
      });

      const publicUrl = file.publicUrl();

      // 4️⃣ Guardar metadata en Firestore
      console.log("📝 Guardando metadata en Firestore...");

      await db.collection("videos").doc(videoId).set(
        {
          videoPath: filePath,
          thumbnailPath: thumbStoragePath,
          thumbnailUrl: publicUrl,
          videoUrl: prefix + encodeURIComponent(filePath),
          duration: durationSeconds,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        {merge: true}
      );

      console.log("✔️ Thumbnail procesado para:", videoId);
    } catch (err) {
      console.error("❌ Error procesando thumbnail:", err);
      throw err;
    } finally {
      try {
        if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
        if (fs.existsSync(tempThumbPath)) fs.unlinkSync(tempThumbPath);
      } catch (cleanupError) {
        console.warn("⚠️ Error limpiando /tmp:", cleanupError);
      }
    }
  }
);
