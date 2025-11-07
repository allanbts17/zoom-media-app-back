/* eslint-disable */
import {Storage} from "@google-cloud/storage";

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET!;
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

export async function getUploadUrl(filename: string): Promise<string> {
  if (!bucketName) throw new Error("GCS_BUCKET no configurado");
  
  const file = storage.bucket(bucketName).file(filename);
  console.log(file)
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutos
    contentType: 'application/octet-stream',
  });
  
  return url;

}
