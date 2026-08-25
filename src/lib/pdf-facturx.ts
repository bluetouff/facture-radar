import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { MAX_FACTURX_XML_BYTES } from "./invoice-verifier.ts";

GlobalWorkerOptions.workerSrc = workerUrl;

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

    for (const [key, attachment] of ordered) {
      const filename = (attachment.filename ?? key).slice(0, 180);
      const content = await document.getAttachmentContent(key);
      if (!(content instanceof Uint8Array)) continue;
      const xml = decodeXml(content);
      if (xml && /<[^>]*CrossIndustryInvoice\b/.test(xml)) return { filename, xml };
    }
    return null;
  } finally {
    await loadingTask.destroy();
  }
}
