/* eslint-disable */
import axios from "axios";
import { Storage } from "@google-cloud/storage";
import { bucketName } from "./gcsService";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_DOWNLOAD_BASE = "https://www.googleapis.com/drive/v3/files";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
}

/**
 * Lista los archivos de una carpeta pública de Google Drive.
 * Requiere GOOGLE_API_KEY en .env y que la carpeta sea pública.
 */
export async function listDriveFiles(folderId: string): Promise<DriveFile[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY no configurado");

  const fields = "files(id,name,mimeType,size,modifiedTime)";
  const q = `'${folderId}' in parents and trashed = false`;

  const { data } = await axios.get(`${DRIVE_API_BASE}/files`, {
    params: {
      key: apiKey,
      q,
      fields,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    },
  });

  return (data.files ?? []) as DriveFile[];
}

/**
 * Descarga un archivo de Drive (carpeta pública) y lo guarda en GCS.
 * Retorna la ruta GCS donde fue guardado (ej. "videos/mi-archivo.mp4").
 */
export async function importDriveFileToGcs(
  fileId: string,
  fileName: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY no configurado");
  if (!bucketName) throw new Error("GCS_BUCKET no configurado");

  const gcsPath = `videos/${fileName}`;
  const storage = new Storage();
  const gcsFile = storage.bucket(bucketName).file(gcsPath);

  // Descarga el archivo como stream desde Drive
  const driveResponse = await axios.get(`${DRIVE_DOWNLOAD_BASE}/${fileId}`, {
    params: { key: apiKey, alt: "media" },
    responseType: "stream",
  });

  // Determina el content type a partir de la respuesta de Drive
  const contentType =
    driveResponse.headers["content-type"] ?? "application/octet-stream";

  // Stream pipe: Drive → GCS
  await new Promise<void>((resolve, reject) => {
    const writeStream = gcsFile.createWriteStream({
      metadata: { contentType },
      resumable: false,
    });
    driveResponse.data.pipe(writeStream);
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
    driveResponse.data.on("error", reject);
  });

  return gcsPath;
}
