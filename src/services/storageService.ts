import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Downscales an image client-side to a maximum width/height while maintaining aspect ratio.
 * @param file The original file object
 * @param maxWidth The maximum width (default 512px)
 * @param quality Adjust quality (0 to 1) for JPEG/WebP (default 0.8)
 * @returns Promise resolving to a Blob
 */
export const downscaleImage = (file: File, maxWidth: number = 512, quality: number = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error("Canvas to Blob conversion failed"));
                        }
                    },
                    file.type, // Maintain original type (e.g., image/jpeg or image/png)
                    quality
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

/**
 * Uploads a profile image to Firebase Storage after downscaling.
 * Stored at: profile_images/{userId} (overwrites existing)
 * @param userId The user's UID
 * @param file The image file
 * @returns Promise resolving to the download URL
 */
export const uploadProfileImage = async (userId: string, file: File): Promise<string> => {
    try {
        // Downscale image before uploading to save bandwidth and storage
        const downscaledBlob = await downscaleImage(file);

        // Create storage reference
        // Note: We use a fixed name 'profile.jpg' (or keep orig extension if needed) 
        // using just userId ensures we overwrite the previous one automatically.
        // Or we can just use the userId as the filename without extension if we don't care about type in filename, 
        // but metadata content-type handles it.
        const storageRef = ref(storage, `profile_images/${userId}`);

        // Upload
        const snapshot = await uploadBytes(storageRef, downscaledBlob);

        // Get URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading profile image:", error);
        throw error;
    }
};
