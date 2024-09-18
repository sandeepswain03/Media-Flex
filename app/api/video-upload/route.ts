import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryUploadResult {
  public_id: string;
  bytes: number;
  duration?: number;
  [key: string]: any;
}

export async function POST(req: NextRequest, res: NextResponse) {
  // Authenticate the user
  const { userId } = auth();

  // If user is not authenticated, return an unauthorized error
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET ||
    !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  ) {
    return NextResponse.json(
      { error: "Cloudinary credentials are not set" },
      { status: 500 }
    );
  }

  try {
    // Extract form data from the request
    const formData = await req.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const originalSize = formData.get("originalSize") as string;
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
          {
            folder: "MediaFlex-videos",
            resource_type: "video",
            public_id: `${userId}-${title}-${Date.now()}`,
            transformation: [
              {
                quality: "auto",
                fetch_format: "mp4",
              },
            ],
          },
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

    const video = await prisma.video.create({
      data: {
        title,
        description,
        publicId: result.public_id,
        originalSize: originalSize,
        compressedSize: result.bytes.toString(),
        duration: result.duration || 0,
      },
    });

    return NextResponse.json({ video }, { status: 200 });
  } catch (error: any) {
    // If an error occurs during the process, return a generic error
    // Note: It's generally better to provide more specific error messages
    console.log("upload video error", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
