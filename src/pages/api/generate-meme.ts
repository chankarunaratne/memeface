import type { NextApiRequest, NextApiResponse } from "next";
import { experimental_generateImage as generateImage } from "ai";
import { openai } from "@ai-sdk/openai";

export const config = {
  api: {
    bodyParser: {
      // Allow larger selfie data URLs in request body
      sizeLimit: "10mb",
    },
  },
};

type GenerateMemeRequestBody = {
  selfie: string; // base64 data URL or URL
  template: string; // public path or URL or identifier
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { selfie, template } = (req.body ||
    {}) as Partial<GenerateMemeRequestBody>;
  if (!selfie || !template) {
    return res
      .status(400)
      .json({ error: "Missing required fields: selfie, template" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res
      .status(500)
      .json({ error: "Server misconfiguration: OPENAI_API_KEY is not set" });
  }

  try {
    // Build absolute URL for template if a relative public path was provided
    const isAbsolute = /^(http|https):\/\//i.test(template);
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = (req.headers["x-forwarded-proto"] as string) || "http";
    const templateUrl = isAbsolute
      ? template
      : host
      ? `${proto}://${host}${template}`
      : template;
    const prompt = [
      "Face-swap task:",
      "- Replace the face in the meme template image with the face from the selfie image.",
      "- Keep the meme's original style, composition, and background intact.",
      "- Blend lighting, skin tone, angle, and expression realistically.",
      "- Output a complete meme image (not a collage), same framing as the template.",
    ].join("\n");

    // Using Vercel AI SDK to call OpenAI's image model (gpt-image-1)
    // Note: Passing image references via prompt text due to provider-specific interfaces.
    const promptWithRefs = `${prompt}\n\nTemplate image URL: ${templateUrl}\nSelfie (may be data URL): ${selfie.slice(
      0,
      80
    )}...`;

    const resultUnknown = await generateImage({
      model: openai.image("gpt-image-1"),
      prompt: promptWithRefs,
      size: "1024x1024",
      // Ask provider for base64 payload so we can always produce a data URL when no URL is returned
      providerOptions: {
        openai: { response_format: "b64_json" },
      },
    });

    // Prefer URL if provided by provider; otherwise fall back to a data URL.
    type MaybeImage = { url?: string; toDataURL?: () => Promise<string> };
    type ImageResult = {
      url?: string;
      image?: MaybeImage;
      images?: MaybeImage[];
      toDataURL?: () => Promise<string>;
    };

    const result = resultUnknown as unknown as ImageResult &
      Record<string, unknown>;

    let imageUrl: string | null = null;

    const toDataUrl = (b64: string | undefined | null) =>
      b64 ? `data:image/png;base64,${b64}` : null;

    // 1) Common SDK shapes
    if (result?.url && typeof result.url === "string") {
      imageUrl = result.url;
    } else if (
      result?.image &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (result as any).image?.toDataURL === "function"
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      imageUrl = await (result as any).image.toDataURL();
    } else if (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (result as any)?.toDataURL === "function"
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      imageUrl = await (result as any).toDataURL();
    } else if (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Array.isArray((result as any)?.images) &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any).images.length > 0
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const first = (result as any).images[0];
      if (typeof first?.url === "string") imageUrl = first.url;
      else if (typeof first?.toDataURL === "function")
        imageUrl = await first.toDataURL();
      else if (typeof first?.b64_json === "string")
        imageUrl = toDataUrl(first.b64_json);
      else if (typeof first?.base64 === "string")
        imageUrl = toDataUrl(first.base64);
    }

    // 2) OpenAI raw shapes (when SDK passes through)
    if (
      !imageUrl &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Array.isArray((result as any)?.data) &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any).data.length > 0
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const first = (result as any).data[0];
      if (typeof first?.url === "string") imageUrl = first.url;
      else if (typeof first?.b64_json === "string")
        imageUrl = toDataUrl(first.b64_json);
      else if (typeof first?.base64 === "string")
        imageUrl = toDataUrl(first.base64);
    }

    // 3) Misc common fields seen across providers
    if (!imageUrl) {
      const b64Fields = [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result as any)?.b64_json,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result as any)?.base64,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result as any)?.image_base64,
      ].filter((v) => typeof v === "string") as string[];
      if (b64Fields.length > 0) imageUrl = toDataUrl(b64Fields[0]);
    }

    if (!imageUrl) {
      // Log available keys to aid debugging in environments where result shape differs
      try {
        // eslint-disable-next-line no-console
        console.warn(
          "/api/generate-meme: unexpected result shape",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Object.keys(resultUnknown as any)
        );
      } catch {}
      return res
        .status(502)
        .json({ error: "Image generation did not return a URL" });
    }

    return res.status(200).json({ url: imageUrl });
  } catch (error: unknown) {
    console.error("/api/generate-meme error", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate meme";
    return res.status(500).json({ error: message });
  }
}
