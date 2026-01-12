/* eslint-disable */
import axios from "axios";

const RECALL_BASE = process.env.RECALL_BASE || "https://us-west-2.recall.ai/api/v1";
const RECALL_API_KEY = process.env.RECALL_API_KEY;

if (!RECALL_API_KEY) {
  console.warn("⚠️ Falta RECALL_API_KEY en .env");
}

const recall = axios.create({
  baseURL: RECALL_BASE,
  headers: {
    "Authorization": `Token ${RECALL_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

export async function createBot(meeting_url: string, bot_name?: string) {
  const payload = {
    meeting_url,
    bot_name: bot_name ?? "MediaBot",
    variant: {zoom: "web_4_core"},
    // Para evitar grabación automática:
    recording_config: {start_recording_on: "manual"},
    // Salida automática si no está grabando por X tiempo:
    automatic_leave: {in_call_not_recording_timeout: 3600},
  };

  const {data} = await recall.post("/bot", payload);
  return data; // incluye id del bot
}

export async function removeBot(id: string) {
  const {data} = await recall.post(`/bot/${id}/leave_call`);
  return data;
}

export async function outputMedia(bot_id: string, url: string) {
  let splited = url.split("https://storage.googleapis.com/zoom-app-dev.firebasestorage.app");
  let base_url = "https://us-central1-zoom-app-dev.cloudfunctions.net/api/videos/play"
  let final_url = base_url + splited[1];
  console.log("Final URL to play:", final_url);
  const payload = {
    camera: {
      kind: "webpage",
      config: { url: final_url},
    },
  };

  const {data} = await recall.post(`/bot/${bot_id}/output_media`, payload);
  return data;
}

export async function stopMedia(bot_id: string) {
  const {data} = await recall.delete(`/bot/${bot_id}/output_media/`);
  return data;
}
