import * as path from "path";

/**
 * Validate a local audio filename and return its upload MIME type.
 * @param {unknown} filename Filename without directory segments.
 * @return {string} MIME type for MP3 or WAV.
 */
export function audioContentType(filename: unknown): string {
  if (typeof filename !== "string" || !filename ||
      path.basename(filename) !== filename || filename.includes("\\")) {
    throw new Error("Nombre de audio inválido");
  }
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".mp3") return "audio/mpeg";
  if (extension === ".wav") return "audio/wav";
  throw new Error("Solo se permiten MP3 y WAV");
}

/**
 * Validate a storage path inside the audio folder.
 * @param {unknown} value Untrusted storage path.
 * @return {string} Validated audio storage path.
 */
export function validateAudioPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("audios/")) {
    throw new Error("Ruta de audio inválida");
  }
  audioContentType(value.slice(7));
  return value;
}
