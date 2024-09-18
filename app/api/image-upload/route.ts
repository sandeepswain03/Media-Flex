import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@clerk/nextjs/server";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryUploadResult {
  public_id: string;
  [key: string]: any;
}

export async function POST(req: NextRequest, res: NextResponse) {
  // Authenticate the user
  const { userId } = auth();

  // If user is not authenticated, return an unauthorized error
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Extract form data from the request
    const formData = await req.formData();
    // Get the file from the form data
    const file = formData.get("file") as File | null;

    // If no file is found, return a bad request error
    if (!file) {
      return NextResponse.json({ error: "file not found" }, { status: 400 });
    }

    // Convert the file to a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload the file to Cloudinary
    const result = await new Promise<CloudinaryUploadResult>(
      (resolve, reject) => {
        // Create an upload stream to Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "MediaFlex-images" }, // Specify the folder in Cloudinary
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result as CloudinaryUploadResult);
            }
          }
        );
        // Send the buffer to the upload stream
        uploadStream.end(buffer);
      }
    );

    // Return the public ID of the uploaded image
    return NextResponse.json({ public_id: result.public_id }, { status: 200 });
  } catch (error: any) {
    // If an error occurs during the process, return a generic error
    // Note: It's generally better to provide more specific error messages
    console.log("upload image error", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
