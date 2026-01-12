/* eslint-disable */
import { Storage } from "@google-cloud/storage";
//import * as admin from "firebase-admin";
import { db } from "..";
import * as path from "path";
import { VideoItem } from "../routes/videos";

const storage = new Storage();
export const bucketName = process.env.GCS_BUCKET!;
const prefix = (process.env.PUBLIC_PREFIX || "").replace(/\/+$/, "") + "/";

type VideoDto = {
  name: string;
  publicUrl: string;
  size: number;
  updated?: string;
};

export async function listVideos(): Promise<VideoDto[]> {
  if (!bucketName) throw new Error("GCS_BUCKET no configurado");
  if (!prefix) throw new Error("PUBLIC_PREFIX no configurado");

  // Si tienes muchos archivos, puedes paginar: { maxResults, pageToken }
  const [files] = await storage.bucket(bucketName).getFiles();
  files[0]?.metadata
  return files
    .filter((f) => /\.mp4$/i.test(f.name))
    .map((f) => ({
      name: f.name,
      publicUrl: prefix + encodeURIComponent(f.name),
      size: Number(f.metadata?.size || 0),
      updated: f.metadata?.updated,
      raw: f
    }));
}

export async function deleteVideo(video: VideoItem): Promise<void> {
  console.log("Deleting video:", video.videoPath);
  if (!bucketName) throw new Error("GCS_BUCKET no configurado");

  const filename = path.basename(video.videoPath);
  const videoId = filename.replace(path.extname(filename), "");

  await storage.bucket(bucketName).file(video.videoPath).delete();
  await storage.bucket(bucketName).file(video.thumbnailPath).delete();
  await db.collection("videos").doc(videoId).delete();
}

export async function getUploadUrl(filename: string): Promise<string> {
  if (!bucketName) throw new Error("GCS_BUCKET no configurado");
  const file = storage.bucket(bucketName).file(`videos/${filename}`);
  console.log(file)
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 5 * 60 * 1000, // 5 minutos
    contentType: 'video/mp4',
  });

  return url;
}

export function getVideoUrlById(id: string): string {
  return `https://storage.googleapis.com/zoom-app-dev.firebasestorage.app/${id}`;
}
