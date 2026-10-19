/** Opens a file the API returned (a PDF or an image) in a new tab; the browser handles the rest. */
export function openBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
