"use client";

/**
 * Browser-side "arcade cartridge" writer for the Creation Station Arcade
 * single-native-arcade kiosk.
 *
 * Uses the File System Access API (Chrome/Edge) to write an arcade-game/
 * folder directly onto a USB stick, plus a signature that binds the game to
 * that stick: a random key file (.arcade-cart-key) is written at the stick
 * root, outside arcade-game/, and signature.txt hashes that key together
 * with the game files. Copying arcade-game/ to a different stick leaves the
 * key behind, so the cabinet refuses it.
 *
 * The cabinet-side verifier is install/arcade-usb-update.sh in the
 * CreationStationArcade repo — the byte format produced here must match it:
 *
 *   signature.txt = "v2:" + sha256hex(
 *     "arcade-cart-v2\n" + key + "\n" +
 *     sorted("<file-sha256>  <basename>\n" for each file in arcade-game/)
 *   )
 */

export interface TarEntry {
  name: string;
  data: Uint8Array;
}

export function usbCartSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "showDirectoryPicker" in window &&
    "DecompressionStream" in window
  );
}

export async function gunzip(buf: ArrayBuffer): Promise<ArrayBuffer> {
  const stream = new Blob([buf])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

/** Minimal tar parser: regular files, GNU longname ('L') entries. */
export function parseTar(buf: ArrayBuffer): TarEntry[] {
  const bytes = new Uint8Array(buf);
  const entries: TarEntry[] = [];
  let offset = 0;
  let longName: string | null = null;

  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);
    if (header[0] === 0) break; // zero block = end of archive

    const name = longName ?? readString(header, 0, 100);
    const size = parseInt(readString(header, 124, 12).trim() || "0", 8);
    const type = String.fromCharCode(header[156]);
    longName = null;

    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    offset = dataStart + Math.ceil(size / 512) * 512;

    if (type === "L") {
      longName = readString(bytes.subarray(dataStart, dataEnd), 0, size);
      continue;
    }
    if (type !== "0" && type !== "\0" && type !== "") continue; // skip dirs/links
    if (name.startsWith("PaxHeader") || name.includes("/PaxHeader")) continue;
    entries.push({ name, data: bytes.slice(dataStart, dataEnd) });
  }
  return entries;
}

function readString(bytes: Uint8Array, start: number, len: number): string {
  const slice = bytes.subarray(start, start + len);
  const end = slice.indexOf(0);
  return new TextDecoder().decode(slice.subarray(0, end === -1 ? len : end));
}

function toHex(bytes: Uint8Array | ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(data: Uint8Array | ArrayBuffer): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", data as BufferSource));
}

async function writeFile(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: Uint8Array | string,
): Promise<void> {
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(data as FileSystemWriteChunkType);
  await writable.close();
}

interface DirectoryPickerWindow {
  showDirectoryPicker(options?: {
    mode?: "read" | "readwrite";
  }): Promise<FileSystemDirectoryHandle>;
}

/**
 * Prompt the user for the stick's root directory and write the cartridge.
 * Returns log lines describing what happened. Throws on abort/failure —
 * callers should catch and display the message.
 */
export async function writeUsbCart(
  tarGz: ArrayBuffer,
  cartName: string,
): Promise<string[]> {
  const log: string[] = [];
  const picker = (window as unknown as DirectoryPickerWindow)
    .showDirectoryPicker;
  const root = await picker.call(window, { mode: "readwrite" });

  const tar = await gunzip(tarGz);
  const entries = parseTar(tar);
  const files = new Map<string, Uint8Array>();
  for (const e of entries) {
    const base = e.name.split("/").pop() ?? "";
    if (!base || base.startsWith(".") || base === "signature.txt" || base === "name.txt") {
      continue;
    }
    files.set(base, e.data);
  }
  if (!files.has("Game") || !files.has("libpxt.so")) {
    throw new Error("Archive doesn't contain Game + libpxt.so");
  }

  const dir = await root.getDirectoryHandle("arcade-game", { create: true });
  for (const [name, data] of files) {
    await writeFile(dir, name, data);
    log.push(`wrote arcade-game/${name} (${(data.length / 1024).toFixed(1)} KB)`);
  }
  await writeFile(dir, "name.txt", cartName + "\n");
  log.push(`wrote arcade-game/name.txt (${cartName})`);

  // Random cart key lives at the stick root, outside arcade-game/. Reuse the
  // existing key if the stick already has one so re-packing keeps working.
  const KEY_FILE = ".arcade-cart-key";
  let key: string;
  try {
    const existing = await (await root.getFileHandle(KEY_FILE)).getFile();
    key = (await existing.text()).trim();
  } catch {
    key = toHex(crypto.getRandomValues(new Uint8Array(16)));
  }
  await writeFile(root, KEY_FILE, key);
  log.push(`wrote ${KEY_FILE} (cart key)`);

  // Signature: v2 scheme, must match the cabinet's expected_signature().
  const names = Array.from(files.keys());
  names.push("name.txt");
  names.sort();
  const encoder = new TextEncoder();
  const lines: string[] = [];
  for (const name of names) {
    const data =
      name === "name.txt" ? encoder.encode(cartName + "\n") : files.get(name)!;
    lines.push(`${await sha256Hex(data)}  ${name}`);
  }
  const sigInput = encoder.encode(
    `arcade-cart-v2\n${key}\n${lines.join("\n")}\n`,
  );
  const signature = `v2:${await sha256Hex(sigInput)}`;
  await writeFile(dir, "signature.txt", signature + "\n");
  log.push(`wrote arcade-game/signature.txt (${signature.slice(0, 20)}…)`);

  log.push("Cartridge ready — eject the stick and plug it into the arcade.");
  return log;
}
