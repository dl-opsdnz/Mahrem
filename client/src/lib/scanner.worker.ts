import { scanText, type ScanSettings } from "./scanner";

interface ScanRequest {
  id: number;
  text: string;
  settings: ScanSettings;
}

const worker = self as unknown as Worker;

worker.addEventListener("message", (event: MessageEvent<ScanRequest>) => {
  const { id, text, settings } = event.data;
  try {
    worker.postMessage({ id, result: scanText(text, settings) });
  } catch (error) {
    worker.postMessage({
      id,
      error: error instanceof Error ? error.message : "scan-failed",
    });
  }
});
