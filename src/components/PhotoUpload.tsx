import { useRef } from "react";

export type PhotoUploadProps = {
  label?: string;
  onChange: (file: File | null, previewUrl: string | null) => void;
  previewUrl?: string | null;
};

export default function PhotoUpload({
  label = "Upload your selfie",
  onChange,
  previewUrl,
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      onChange(null, null);
      return;
    }
    const url = URL.createObjectURL(file);
    onChange(file, url);
  }

  return (
    <div className="w-full">
      {label ? (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      ) : null}
      <div className="flex items-start gap-4">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex-1 min-h-[96px] flex items-center">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Selfie preview"
              className="h-24 w-24 rounded object-cover border border-gray-200"
            />
          ) : (
            <div className="text-sm text-gray-500">No photo selected</div>
          )}
        </div>
      </div>
    </div>
  );
}
