import { FLAG_REASONS } from "../types";

interface FlagPickerProps {
  onSelect: (reason: string) => void;
  onCancel: () => void;
}

export function FlagPicker({ onSelect, onCancel }: FlagPickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-surface-elevated p-4 sm:rounded-2xl sm:p-6">
        <h3 className="mb-4 text-lg font-bold text-white">Flag reason</h3>
        <div className="space-y-2">
          {FLAG_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => onSelect(reason)}
              className="w-full rounded-xl bg-zinc-800 px-4 py-4 text-left text-base font-medium text-white active:bg-cfa-red"
            >
              {reason}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 w-full rounded-xl py-3 text-sm font-semibold text-zinc-400 active:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
