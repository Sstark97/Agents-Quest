/** Byte order mark so that spreadsheets open the file as UTF-8 (accents in team names). */
const UTF8_BOM = "﻿";

/** Saves text as a file through the browser. Nothing is kept once the download starts. */
export function downloadText(fileName: string, text: string, mimeType = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([UTF8_BOM + text], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
