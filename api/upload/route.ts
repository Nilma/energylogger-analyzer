import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";

import { NextResponse } from "next/server";

export async function POST(
  request: Request
): Promise<NextResponse> {
  const body =
    (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse =
      await handleUpload({
        body,
        request,

        onBeforeGenerateToken:
          async () => {
            return {
              allowedContentTypes: [
                "text/csv",
                "application/csv",
                "application/vnd.ms-excel",
                "text/plain",
              ],

              maximumSizeInBytes:
                50 * 1024 * 1024,

              addRandomSuffix: true,
            };
          },

        onUploadCompleted:
          async ({ blob }) => {
            console.log(
              "EnergyLogger CSV uploaded:",
              blob.pathname
            );
          },
      });

    return NextResponse.json(
      jsonResponse
    );
  } catch (error) {
    console.error(
      "Blob upload error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to upload CSV.",
      },
      {
        status: 400,
      }
    );
  }
}