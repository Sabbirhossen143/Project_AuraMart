
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";

import { authOptions } from "@/lib/auth/options";
import { getUserById } from "@/repositories/user.repository";
import { dynamoDB } from "@/lib/aws/dynamodb";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

export async function GET() {
  try {
    // Verify authentication
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

    // Get current user from database
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

    // Exclude password and internal database fields
    const {
      password,
      PK,
      SK,
      entityType,
      ...safeUser
    } = user;

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

    // Only editable personal information is accepted.
    // Email, role, isActive and password are never updated here.
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const address =
      typeof body.address === "string" ? body.address.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const postalCode =
      typeof body.postalCode === "string" ? body.postalCode.trim() : "";
    const country =
      typeof body.country === "string" ? body.country.trim() : "";
    const hasProfileImage = Object.prototype.hasOwnProperty.call(body, "profileImage");
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

    const updateExpression = hasProfileImage
      ? "SET #name = :name, phone = :phone, #address = :address, city = :city, postalCode = :postalCode, country = :country, profileImage = :profileImage, updatedAt = :updatedAt"
      : "SET #name = :name, phone = :phone, #address = :address, city = :city, postalCode = :postalCode, country = :country, updatedAt = :updatedAt";

    const expressionValues: Record<string, unknown> = {
      ":name": name,
      ":phone": phone,
      ":address": address,
      ":city": city,
      ":postalCode": postalCode,
      ":country": country,
      ":updatedAt": new Date().toISOString(),
      ":active": true,
    };
    if (hasProfileImage) expressionValues[":profileImage"] = profileImage || null;

    const result = await dynamoDB.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${session.user.id}`,
          SK: "PROFILE",
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: {
          "#name": "name",
          "#address": "address",
        },
        ExpressionAttributeValues: expressionValues,
        ConditionExpression: "attribute_exists(PK) AND isActive = :active",
        ReturnValues: "ALL_NEW",
      })
    );

    const updated = result.Attributes ?? {};
    const {
      password,
      PK,
      SK,
      entityType,
      ...safeUser
    } = updated as Record<string, unknown>;

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
