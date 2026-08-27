export const MAX_PDF_ATTACHMENT_BYTES = 2 * 1024 * 1024;

const METHOD_MARKER = "  static readStreamContent(stream) {";
const METHOD_END_MARKER = "\n  }\n";
const UNBOUNDED_READ = "    return stream.getBytes();";
const ENSURE_BUFFER_MARKER = [
  "  ensureBuffer(requested) {",
  "    const buffer = this.buffer;",
].join("\n");

const ALLOWED_ATTACHMENT_STREAMS = [
  "Ascii85Stream",
  "AsciiHexStream",
  "DecryptStream",
  "FlateStream",
  "LZWStream",
  "PredictorStream",
  "RunLengthStream",
  "Stream",
];

export function buildBoundedPdfWorkerSource(source) {
  if (typeof source !== "string" || source.length === 0) {
    throw new Error("Source PDF.js absente");
  }

  if (source.split(ENSURE_BUFFER_MARKER).length !== 2) {
    throw new Error("Point de contrôle mémoire PDF.js absent ou ambigu");
  }
  const sentinel = MAX_PDF_ATTACHMENT_BYTES + 1;
  const boundedEnsureBuffer = [
    "  ensureBuffer(requested) {",
    "    const paCheckLimit = this._paCheckAttachmentLimit;",
    "    if (paCheckLimit && requested > paCheckLimit) {",
    '      throw new Error("Embedded PDF attachment exceeds the local limit");',
    "    }",
    "    const buffer = this.buffer;",
  ].join("\n");
  const sourceWithBoundedBuffers = source.replace(ENSURE_BUFFER_MARKER, boundedEnsureBuffer);

  const methodStart = sourceWithBoundedBuffers.indexOf(METHOD_MARKER);
  if (methodStart < 0 || source.indexOf(METHOD_MARKER, methodStart + METHOD_MARKER.length) >= 0) {
    throw new Error("Méthode de lecture PDF.js inattendue");
  }
  const methodEnd = sourceWithBoundedBuffers.indexOf(METHOD_END_MARKER, methodStart);
  if (methodEnd < 0) throw new Error("Fin de méthode PDF.js introuvable");

  const method = sourceWithBoundedBuffers.slice(methodStart, methodEnd + METHOD_END_MARKER.length);
  if (method.split(UNBOUNDED_READ).length !== 2) {
    throw new Error("Lecture non bornée PDF.js absente ou ambiguë");
  }

  const boundedRead = [
    `    const allowedStreams = new Set(${JSON.stringify(ALLOWED_ATTACHMENT_STREAMS)});`,
    "    const visitedStreams = new Set();",
    "    let currentStream = stream;",
    "    while (currentStream instanceof BaseStream) {",
    "      if (visitedStreams.has(currentStream) || !allowedStreams.has(currentStream.constructor?.name)) {",
    "        return null;",
    "      }",
    "      visitedStreams.add(currentStream);",
    `      currentStream._paCheckAttachmentLimit = ${sentinel};`,
    "      currentStream = currentStream.stream;",
    "    }",
    `    const content = stream.getBytes(${sentinel});`,
    `    return content.byteLength > ${MAX_PDF_ATTACHMENT_BYTES} ? null : content;`,
  ].join("\n");
  const boundedMethod = method.replace(UNBOUNDED_READ, boundedRead);
  if (!boundedMethod.includes(`stream.getBytes(${sentinel})`) || boundedMethod.includes(UNBOUNDED_READ)) {
    throw new Error("La borne PDF.js n'a pas été appliquée");
  }

  return sourceWithBoundedBuffers.slice(0, methodStart)
    + boundedMethod
    + sourceWithBoundedBuffers.slice(methodEnd + METHOD_END_MARKER.length);
}
