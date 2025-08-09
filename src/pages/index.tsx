import { useMemo, useState } from "react";
import PhotoUpload from "@/components/PhotoUpload";
import MemeTemplateGrid, { MemeTemplate } from "@/components/MemeTemplateGrid";
import GenerateButton from "@/components/GenerateButton";

export default function Home() {
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const templates = useMemo<MemeTemplate[]>(
    () => [
      { id: "evil-kid", label: "Evil Kid", src: "/templates/evil-kid.jpeg" },
    ],
    []
  );

  function handleSelfieChange(file: File | null, previewUrl: string | null) {
    setSelfieFile(file);
    setSelfiePreview(previewUrl);
  }

  async function handleGenerateClick() {
    if (!selfieFile || !selectedTemplateId) return;
    setIsGenerating(true);
    setGeneratedUrl(null);
    setErrorMessage(null);

    try {
      // Convert selfie to data URL for transport
      const selfieDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(selfieFile);
      });

      const selectedTemplate = templates.find(
        (t) => t.id === selectedTemplateId
      );
      const resp = await fetch("/api/generate-meme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selfie: selfieDataUrl,
          template: selectedTemplate?.src,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || `Request failed: ${resp.status}`);
      }
      const data = (await resp.json()) as { url: string };
      setGeneratedUrl(data.url);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to generate meme";
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <h1 className="text-xl font-semibold">Memeface</h1>
          <p className="text-sm text-gray-600">
            Upload your selfie, pick a meme, and generate. (UI skeleton)
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 grid gap-8">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="md:col-span-1">
            <PhotoUpload
              previewUrl={selfiePreview}
              onChange={handleSelfieChange}
            />
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-700">
                Choose a meme template
              </h2>
              <GenerateButton
                disabled={!selfieFile || !selectedTemplateId}
                loading={isGenerating}
                onClick={handleGenerateClick}
              />
            </div>
            <MemeTemplateGrid
              templates={templates}
              selectedId={selectedTemplateId}
              onSelect={setSelectedTemplateId}
            />
            {isGenerating ? (
              <div className="mt-4 text-sm text-gray-600">
                Generating meme...
              </div>
            ) : null}
            {errorMessage ? (
              <div className="mt-4 text-sm text-red-600">{errorMessage}</div>
            ) : null}
            {generatedUrl ? (
              <div className="mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={generatedUrl}
                  alt="Generated meme"
                  className="w-full max-w-md rounded border border-gray-200"
                />
              </div>
            ) : null}
          </div>
        </section>
      </main>
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-gray-500">
          UI scaffold only. Backend and AI integration coming later.
        </div>
      </footer>
    </div>
  );
}
