import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import { MAX_FACTURX_XML_BYTES } from "./invoice-verifier.ts";

export const BOUNDED_PDF_WORKER_URL = "/assets/pdf.worker.bounded-v1.mjs";
const MAX_PDF_ATTACHMENTS_TO_INSPECT = 8;
const MAX_PDF_ATTACHMENT_BYTES_INSPECTED = 4 * 1024 * 1024;

GlobalWorkerOptions.workerSrc = BOUNDED_PDF_WORKER_URL;

export interface EmbeddedFacturX {
  filename: string;
  xml: string;
}

interface PdfAttachment {
  filename?: string;
}

function attachmentEntries(attachments: Map<string, PdfAttachment> | Record<string, PdfAttachment> | null): Array<[string, PdfAttachment]> {
  if (!attachments) return [];
  if (attachments instanceof Map) return [...attachments.entries()];
  return Object.entries(attachments);
}

function decodeXml(content: Uint8Array): string | null {
  if (content.byteLength === 0 || content.byteLength > MAX_FACTURX_XML_BYTES) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(content);
  } catch {
    return null;
  }
}

export async function extractFacturXFromPdf(data: Uint8Array): Promise<EmbeddedFacturX | null> {
  const loadingTask = getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
    useWasm: false,
    enableXfa: false,
    stopAtErrors: true,
    verbosity: 0,
  });

  try {
    const document = await loadingTask.promise;
    const attachments = attachmentEntries(await document.getAttachments());
    const ordered = attachments.sort(([leftKey, left], [rightKey, right]) => {
      const leftName = (left.filename ?? leftKey).toLowerCase();
      const rightName = (right.filename ?? rightKey).toLowerCase();
      const score = (name: string) => name === "factur-x.xml" ? 0 : name.endsWith(".xml") ? 1 : 2;
      return score(leftName) - score(rightName);
    });

    let inspectedBytes = 0;
    for (const [key, attachment] of ordered.slice(0, MAX_PDF_ATTACHMENTS_TO_INSPECT)) {
      const filename = (attachment.filename ?? key).slice(0, 180);
      const content = await document.getAttachmentContent(key);
      if (!(content instanceof Uint8Array)) continue;
      inspectedBytes += content.byteLength;
      if (inspectedBytes > MAX_PDF_ATTACHMENT_BYTES_INSPECTED) return null;
      const xml = decodeXml(content);
      if (xml && /<[^>]*CrossIndustryInvoice\b/.test(xml)) return { filename, xml };
    }
    return null;
  } finally {
    await loadingTask.destroy();
  }
}
