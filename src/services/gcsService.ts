/* eslint-disable */
import { Storage } from "@google-cloud/storage";
import multer from "multer";
// import { Stream } from 'stream';

const storage = new Storage();
export const bucketName = process.env.GCS_BUCKET!;
const prefix = (process.env.PUBLIC_PREFIX || "").replace(/\/+$/, "") + "/";

type VideoDto = {
  name: string;
  publicUrl: string;
  size: number;
  updated?: string;
};

// interface UploadResponse {
//   success: boolean;
//   fileName: string;
//   size: number;
//   url: string;
// }

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

export function getMulter(): multer.Multer {
  console.log("Configuring multer for file uploads");
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024, // Límite de 100MB
    },
    fileFilter: (req, file, cb) => {
      // Validar que sea un archivo de video
      const allowedMimeTypes = [
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska',
        'video/webm'
      ];

      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de archivo no válido. Solo se permiten videos.'));
      }
    }
  });
}

// export function getStream(file: Express.Multer.File): { blobStream: Stream.Writable, blob: File, fileName: string } {
//   // Generar nombre único para el archivo
//   //const timestamp = Date.now();
//   const originalName = file.originalname.replace(/\s+/g, '_');
//   const fileName = `${originalName}`;

//   // Crear referencia al archivo en el bucket
//   const blob = storage.bucket(bucketName).file(fileName);

//   // Crear stream de escritura
//   const blobStream = blob.createWriteStream({
//     resumable: false,
//     metadata: {
//       contentType: file.mimetype,
//       metadata: {
//         originalName: file.originalname,
//         uploadedAt: new Date().toISOString(),
//       }
//     }
//   });
//   return { blobStream, blob, fileName }
// }


// export async function uploadVideo(file: Express.Multer.File): Promise<UploadResponse> {
//   return new Promise((resolve, reject) => {
//     const fileName = `${file.originalname}`;
//     const blob = storage.bucket(bucketName).file(fileName);
    
//     const blobStream = blob.createWriteStream({
//       resumable: false,
//       metadata: {
//         contentType: file.mimetype,
//       }
//     });
    
//     blobStream.on('error', (err) => {
//       reject(err);
//     });
    
//     blobStream.on('finish', async () => {
//       // Generar URL firmada
//       const [signedUrl] = await blob.getSignedUrl({
//         version: 'v4',
//         action: 'read',
//         expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
//       });
      
//       resolve({
//         success: true,
//         fileName,
//         size: file.size,
//         url: signedUrl
//       });
//     });
    
//     blobStream.end(file.buffer);
//   });
// }

export async function getUploadUrl(filename: string): Promise<string> {
  if (!bucketName) throw new Error("GCS_BUCKET no configurado");

  const file = storage.bucket(bucketName).file(filename);
  console.log(file)
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 5 * 60 * 1000, // 5 minutos
    contentType: 'video/mp4',
  });

  return url;

}
