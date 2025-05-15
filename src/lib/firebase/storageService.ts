
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

/**
 * Uploads a video file to Firebase Storage.
 * @param file The video file to upload.
 * @param path The base path in Firebase Storage (e.g., "videos").
 * @returns A promise that resolves with the download URL of the uploaded file.
 */
export const uploadVideoToFirebaseStorage = async (file: File, path: string): Promise<string> => {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized. Cannot upload video.");
  }

  if (!file) {
    throw new Error("No file provided for upload.");
  }

  const fileName = `${Date.now()}-${file.name}`;
  const storageRef = ref(storage, `${path}/${fileName}`);

  try {
    console.log(`Attempting to upload ${file.name} to ${storageRef.fullPath}...`);
    const snapshot = await uploadBytes(storageRef, file);
    console.log('Uploaded a blob or file!', snapshot);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('File available at', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading video to Firebase Storage:", error);
    throw new Error(`Failed to upload video: ${(error as Error).message}`);
  }
};

/**
 * Uploads an image file to Firebase Storage.
 * @param file The image file to upload.
 * @param path The base path in Firebase Storage (e.g., "posters").
 * @returns A promise that resolves with the download URL of the uploaded file.
 */
export const uploadImageToFirebaseStorage = async (file: File, path: string): Promise<string> => {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized. Cannot upload image.");
  }

  if (!file) {
    throw new Error("No file provided for image upload.");
  }

  const fileName = `${Date.now()}-${file.name}`;
  const storageRef = ref(storage, `${path}/${fileName}`);

  try {
    console.log(`Attempting to upload image ${file.name} to ${storageRef.fullPath}...`);
    const snapshot = await uploadBytes(storageRef, file);
    console.log('Uploaded image!', snapshot);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Image available at', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image to Firebase Storage:", error);
    throw new Error(`Failed to upload image: ${(error as Error).message}`);
  }
};
