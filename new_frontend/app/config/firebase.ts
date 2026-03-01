/**
 * Firebase configuration — initializes Firebase App + Storage.
 * Used for uploading supporting documents during tokenization.
 */
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBfX0z3OTwsjveFSrV32qSumParIhJpHy4',
  authDomain: 'asset-linked.firebaseapp.com',
  projectId: 'asset-linked',
  storageBucket: 'asset-linked.firebasestorage.app',
  messagingSenderId: '593055466012',
  appId: '1:593055466012:web:dd971eb8596f95928e95d9',
  measurementId: 'G-LS6TLMV6VY',
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);

export interface UploadedDocument {
  name: string;
  url: string;
  type: string;
  size: number;
}

/**
 * Upload a single file to Firebase Storage under `asset-documents/{walletAddress}/`.
 * Returns the download URL and metadata once complete.
 */
export async function uploadDocument(
  file: File,
  walletAddress: string,
  onProgress?: (percent: number) => void,
): Promise<UploadedDocument> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `asset-documents/${walletAddress}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.(percent);
      },
      (error) => {
        reject(new Error(`Upload failed: ${error.message}`));
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            name: file.name,
            url: downloadURL,
            type: file.type || 'application/octet-stream',
            size: file.size,
          });
        } catch (err: any) {
          reject(new Error(`Failed to get download URL: ${err.message}`));
        }
      },
    );
  });
}

/**
 * Upload multiple files sequentially and return all metadata.
 */
export async function uploadDocuments(
  files: File[],
  walletAddress: string,
  onProgress?: (fileIndex: number, percent: number) => void,
): Promise<UploadedDocument[]> {
  const results: UploadedDocument[] = [];
  for (let i = 0; i < files.length; i++) {
    const doc = await uploadDocument(files[i], walletAddress, (p) => onProgress?.(i, p));
    results.push(doc);
  }
  return results;
}
