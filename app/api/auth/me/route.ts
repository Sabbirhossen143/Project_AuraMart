
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";
import {
  getUserById,
  updateUserProfile,
} from "@/repositories/user.repository";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please login first.",
        },
        { status: 401 }
      );
    }

    const user = await getUserById(session.user.id);

    if (!user || !user.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "User account not found or inactive.",
        },
        { status: 401 }
      );
    }

    // Exclude password
    const { password, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      data: safeUser,
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve profile.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please login first.",
        },
        { status: 401 }
      );
    }

    const user = await getUserById(session.user.id);

    if (!user || !user.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "User account not found or inactive.",
        },
        { status: 401 }
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid request body." },
        { status: 400 }
      );
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const address =
      typeof body.address === "string" ? body.address.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const postalCode =
      typeof body.postalCode === "string" ? body.postalCode.trim() : "";
    const country =
      typeof body.country === "string" ? body.country.trim() : "";

    const hasProfileImage = Object.prototype.hasOwnProperty.call(
      body,
      "profileImage"
    );

    const profileImage =
      typeof body.profileImage === "string" ? body.profileImage : "";

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        {
          success: false,
          message: "Name must be between 2 and 80 characters.",
        },
        { status: 400 }
      );
    }

    if (
      phone.length > 24 ||
      address.length > 240 ||
      city.length > 80 ||
      postalCode.length > 20 ||
      country.length > 60 ||
      (hasProfileImage &&
        profileImage !== "" &&
        (!profileImage.startsWith("data:image/jpeg;base64,") ||
          profileImage.length > 230 * 1024))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more profile fields exceed the allowed length.",
        },
        { status: 400 }
      );
    }

    const updated = await updateUserProfile(session.user.id, {
      name,
      phone,
      address,
      city,
      postalCode,
      country,
      ...(hasProfileImage
        ? { profileImage: profileImage || null }
        : {}),
    });

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          message: "User account not found or inactive.",
        },
        { status: 401 }
      );
    }

    const { password, ...safeUser } = updated;

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      data: safeUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update profile.",
      },
      { status: 500 }
    );
  }
}
