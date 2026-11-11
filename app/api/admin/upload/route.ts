
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";
import { cloudinary } from "@/lib/cloudinary";


const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Please sign in first." },
        { status: 401 }
      );
    }

    // 2. Only Admin can upload
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      );
    }

    // 3. Check Cloudinary credentials
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Cloudinary configuration is missing.",
        },
        { status: 500 }
      );
    }

    // 4. Read uploaded file
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Please select an image." },
        { status: 400 }
      );
    }

    // 5. Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Only JPG, PNG, WEBP and AVIF images are allowed.",
        },
        { status: 400 }
      );
    }

    // 6. Validate file size
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "Image must be greater than 0 and no larger than 5 MB.",
        },
        { status: 413 }
      );
    }

    // 7. Convert file to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 8. Upload to Cloudinary
    const uploadedImage = await new Promise<{
      secure_url: string;
      public_id: string;
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "auramart/products",
          resource_type: "image",
          transformation: [
            {
              width: 1200,
              height: 1200,
              crop: "limit",
            },
            {
              quality: "auto",
              fetch_format: "auto",
            },
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result) {
            reject(new Error("Image upload returned no result."));
            return;
          }

          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
          });
        }
      );

      stream.end(buffer);
    });

    // 9. Return uploaded image URL
    return NextResponse.json(
      {
        success: true,
        message: "Image uploaded successfully.",
        data: {
          imageUrl: uploadedImage.secure_url,
          publicId: uploadedImage.public_id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Image Upload Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Image upload failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
