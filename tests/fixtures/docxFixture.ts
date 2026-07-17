import JSZip from "jszip";

/**
 * A minimal DOCX (OOXML) writer for test fixtures.
 *
 * mammoth reads `word/document.xml` directly; a generic docx library would
 * hide exactly the structural detail these fixtures need to control — plain
 * paragraphs, a table, an image reference, and a genuinely unrecognised
 * element that mammoth cannot read. Building the package by hand keeps that
 * control explicit, the same reasoning as `pdfFixture.ts`.
 */

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const PACKAGE_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

// A 1x1 transparent PNG, just enough bytes for a valid image part.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const DOC_NAMESPACES =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

function paragraph(text: string): string {
  return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrapDocument(bodyXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${DOC_NAMESPACES}><w:body>${bodyXml}</w:body></w:document>`;
}

export interface DocxFixtureOptions {
  paragraphs?: string[];
  /** Number of `<w:tbl>` table elements to include. */
  tableCount?: number;
  /** Number of image relationships/drawings to include. */
  imageCount?: number;
  /** Include one element name mammoth has no reader for, forcing a warning message. */
  includeUnrecognisedElement?: boolean;
}

const TABLE_XML =
  "<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Cell A</w:t></w:r></w:p></w:tc>" +
  "<w:tc><w:p><w:r><w:t>Cell B</w:t></w:r></w:p></w:tc></w:tr></w:tbl>";

const UNRECOGNISED_XML = "<w:thisElementDoesNotExistInMammoth/>";

function imageDrawingXml(relId: string): string {
  return (
    "<w:p><w:r><w:drawing><wp:inline " +
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">' +
    '<wp:extent cx="100000" cy="100000"/>' +
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
    '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    `<pic:blipFill><a:blip r:embed="${relId}" ` +
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/></pic:blipFill>' +
    "</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>"
  );
}

/** Build a minimal but real DOCX package as bytes. */
export async function buildDocx(
  options: DocxFixtureOptions = {},
): Promise<Uint8Array<ArrayBuffer>> {
  const {
    paragraphs = ["Hello from the fixture."],
    tableCount = 0,
    imageCount = 0,
    includeUnrecognisedElement = false,
  } = options;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", PACKAGE_RELS);

  const parts: string[] = paragraphs.map(paragraph);
  for (let i = 0; i < tableCount; i++) parts.push(TABLE_XML);

  const relationships: string[] = [];
  for (let i = 0; i < imageCount; i++) {
    const relId = `rIdImg${i}`;
    relationships.push(
      `<Relationship Id="${relId}" ` +
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" ' +
        `Target="media/image${i}.png"/>`,
    );
    zip.file(`word/media/image${i}.png`, TINY_PNG_BASE64, { base64: true });
    parts.push(imageDrawingXml(relId));
  }

  if (includeUnrecognisedElement) parts.push(UNRECOGNISED_XML);

  zip.file("word/document.xml", wrapDocument(parts.join("")));

  if (relationships.length > 0) {
    zip.file(
      "word/_rels/document.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join("")}</Relationships>`,
    );
  }

  return zip.generateAsync({ type: "uint8array" }) as Promise<Uint8Array<ArrayBuffer>>;
}
