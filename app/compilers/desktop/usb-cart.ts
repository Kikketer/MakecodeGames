"use client";

/**
 * Browser-side USB writer for the Creation Station Arcade
 * single-native-arcade kiosk.
 *
 * Uses the File System Access API (Chrome/Edge) to drop the compiled
 * .tar.gz straight onto a USB stick. The cabinet watches for inserted
 * drives, extracts the first *.tar.gz it finds, installs the game, and
 * reboots into it. The archive is written as-is — the same bytes as the
 * normal download.
 */

export function usbCartSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "showDirectoryPicker" in window &&
    "FileSystemWritableFileStream" in window
  );
}

interface DirectoryPickerWindow {
  showDirectoryPicker(options?: {
    mode?: "read" | "readwrite";
  }): Promise<FileSystemDirectoryHandle>;
}

/**
 * Prompt the user for the stick's root folder and write the tarball.
 * Throws on abort/failure — callers should catch and display the message.
 */
export async function writeUsbCart(
  tarGz: ArrayBuffer,
  filename: string,
): Promise<string[]> {
  const picker = (window as unknown as DirectoryPickerWindow)
    .showDirectoryPicker;
  const root = await picker.call(window, { mode: "readwrite" });

  const handle = await root.getFileHandle(filename, { create: true });
  const writable = await handle.createWritable();
  await writable.write(tarGz);
  await writable.close();

  return [
    `wrote ${filename} (${(tarGz.byteLength / 1024).toFixed(1)} KB) to the stick`,
    "Cartridge ready — eject the stick and plug it into the arcade.",
  ];
}
