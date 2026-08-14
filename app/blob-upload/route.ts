import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,

      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            "text/csv",
            "application/csv",
            "application/vnd.ms-excel",
            "text/plain",
          ],
          maximumSizeInBytes: 50 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },

      onUploadCompleted: async ({ blob }) => {
        console.log("Uploaded:", blob.pathname);
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    console.error("Blob upload error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Blob upload failed",
      },
      { status: 400 }
    );
  }
}