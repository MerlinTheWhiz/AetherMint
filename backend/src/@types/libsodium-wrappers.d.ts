declare module 'libsodium-wrappers' {
  export const ready: Promise<void>;
  export function crypto_box_keypair(): { publicKey: Uint8Array; privateKey: Uint8Array };
  export function crypto_scalarmult(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array;
  export function to_hex(data: Uint8Array): string;
  export function from_hex(hex: string): Uint8Array;
  export function from_string(str: string): Uint8Array;
  export function randombytes_buf(length: number): Uint8Array;
  export function crypto_secretbox_easy(message: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array;
  export function crypto_secretbox_open_easy(ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array;
  export function crypto_sign_detached(message: Uint8Array, privateKey: Uint8Array): Uint8Array;
  export function crypto_sign_verify_detached(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean;
  export function crypto_secretbox_keygen(): Uint8Array;
  export const crypto_secretbox_NONCEBYTES: number;
  export function to_string(data: Uint8Array): string;
}
