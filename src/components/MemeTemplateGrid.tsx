export type MemeTemplate = {
  id: string;
  label: string;
  src: string; // public path
};

export type MemeTemplateGridProps = {
  templates: MemeTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function MemeTemplateGrid({
  templates,
  selectedId,
  onSelect,
}: MemeTemplateGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {templates.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          className={
            "group relative rounded-lg overflow-hidden border transition shadow-sm " +
            (selectedId === t.id
              ? "border-indigo-500 ring-2 ring-indigo-500"
              : "border-gray-200 hover:border-gray-300")
          }
          aria-pressed={selectedId === t.id}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.src} alt={t.label} className="h-28 w-full object-cover" />
          <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs px-2 py-1">
            {t.label}
          </div>
        </button>
      ))}
    </div>
  );
}
