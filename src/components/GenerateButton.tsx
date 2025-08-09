export type GenerateButtonProps = {
  disabled?: boolean;
  onClick?: () => void;
  loading?: boolean;
};

export default function GenerateButton({
  disabled,
  onClick,
  loading,
}: GenerateButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Generating..." : "Generate"}
    </button>
  );
}
