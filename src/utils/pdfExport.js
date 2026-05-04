import html2pdf from 'html2pdf.js';

// ─── Shared PDF options factory ───────────────────────────────────────────────
function buildOptions(filename) {
  return {
    margin:      [10, 10, 10, 10],
    filename:    filename || 'relatorio-profileai.pdf',
    image:       { type: 'jpeg', quality: 0.95 },
    html2canvas: {
      scale:           2,
      useCORS:         true,
      backgroundColor: '#FFFFFF',
      logging:         false,
    },
    jsPDF: {
      unit:        'mm',
      format:      'a4',
      orientation: 'portrait',
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };
}

/**
 * Export a DOM element as a downloadable PDF file.
 *
 * @param {string} elementId - The id attribute of the DOM element to export
 * @param {string} filename  - Output filename (e.g. "relatorio-grupo.pdf")
 * @returns {Promise<void>}
 */
export async function exportReportAsPDF(elementId, filename) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`[pdfExport] Element with id "${elementId}" not found.`);
    return;
  }

  const options = buildOptions(filename);
  return html2pdf().set(options).from(element).save();
}

/**
 * Export a DOM element as a PDF Blob (for preview or upload).
 *
 * @param {string} elementId - The id attribute of the DOM element to export
 * @param {string} filename  - Optional filename metadata
 * @returns {Promise<Blob|null>}
 */
export async function exportReportAsBlob(elementId, filename) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`[pdfExport] Element with id "${elementId}" not found.`);
    return null;
  }

  const options = buildOptions(filename);
  return html2pdf().set(options).from(element).outputPdf('blob');
}

/**
 * Export a DOM element as a base64 data URI string.
 *
 * @param {string} elementId
 * @param {string} filename
 * @returns {Promise<string|null>}
 */
export async function exportReportAsDataUri(elementId, filename) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`[pdfExport] Element with id "${elementId}" not found.`);
    return null;
  }

  const options = buildOptions(filename);
  return html2pdf().set(options).from(element).outputPdf('datauristring');
}
