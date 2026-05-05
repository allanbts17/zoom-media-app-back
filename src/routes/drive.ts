/* eslint-disable */
import { Router } from "express";
import { listDriveFiles, importDriveFileToGcs } from "../services/driveService";

const router = Router();

const DEFAULT_FOLDER_ID = process.env.DRIVE_FOLDER_ID ?? "";

/**
 * GET /drive/files
 * Lista los archivos de la carpeta de Drive configurada.
 * Query param opcional: folderId (si no se pasa, usa DRIVE_FOLDER_ID del .env)
 */
router.get("/files", async (req, res) => {
  try {
    const folderId = (req.query.folderId as string) || DEFAULT_FOLDER_ID;
    if (!folderId) {
      return void res
        .status(400)
        .json({ error: "folderId requerido (query param o DRIVE_FOLDER_ID en .env)" });
    }
    const files = await listDriveFiles(folderId);
    res.json({ files });
  } catch (err: any) {
    console.error("Error GET /drive/files:", err.message);
    res.status(500).json({ error: err.message ?? "Error listando archivos de Drive" });
  }
});

/**
 * POST /drive/import
 * Body: { fileId: string, fileName: string }
 * Descarga el archivo de Drive y lo guarda en GCS.
 */
router.post("/import", async (req, res) => {
  try {
    const { fileId, fileName } = req.body as { fileId?: string; fileName?: string };

    if (!fileId || !fileName) {
      return void res.status(400).json({ error: "fileId y fileName son requeridos" });
    }

    console.log(`Importando de Drive: ${fileName} (${fileId})`);
    const gcsPath = await importDriveFileToGcs(fileId, fileName);
    console.log(`Importado exitosamente a GCS: ${gcsPath}`);

    res.json({ gcsPath });
  } catch (err: any) {
    console.error("Error POST /drive/import:", err.message);
    res.status(500).json({ error: err.message ?? "Error importando archivo de Drive" });
  }
});

export default router;
