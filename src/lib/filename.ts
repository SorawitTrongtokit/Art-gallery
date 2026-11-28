export function fileKey(filename: string): string {
  return filename.trim().normalize('NFC').toLowerCase();
}
