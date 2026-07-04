"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Info,
  Thermometer,
  Undo2,
} from "lucide-react";
import type { ChecklistItem, TaskCompletion } from "@/lib/types";
import { formatTime, taskTypeLabel } from "@/lib/utils";

interface TaskItemProps {
  item: ChecklistItem;
  index: number;
  completion?: TaskCompletion;
  onComplete: (data: {
    value?: string | boolean | number;
    photoDataUrl?: string;
    notes?: string;
  }) => void;
  onUndo: () => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function TaskItem({
  item,
  index,
  completion,
  onComplete,
  onUndo,
}: TaskItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [textValue, setTextValue] = useState("");
  const [numberValue, setNumberValue] = useState("");
  const [tempValue, setTempValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isDone = Boolean(completion);

  const validateTemperature = (value: number): string | null => {
    if (Number.isNaN(value)) return "Enter a valid temperature.";
    if (item.minTemp !== undefined && value < item.minTemp) {
      return `Below minimum (${item.minTemp}°F). Document corrective action.`;
    }
    if (item.maxTemp !== undefined && value > item.maxTemp) {
      return `Above maximum (${item.maxTemp}°F). Document corrective action.`;
    }
    return null;
  };

  const handlePhotoSelect = async (file: File | undefined) => {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    onComplete({ photoDataUrl: dataUrl });
    setError(null);
  };

  const submitValue = () => {
    setError(null);

    if (item.type === "checkbox") {
      onComplete({ value: true });
      return;
    }

    if (item.type === "yes_no") {
      onComplete({ value: true });
      return;
    }

    if (item.type === "text") {
      if (item.required && !textValue.trim()) {
        setError("This field is required.");
        return;
      }
      onComplete({ value: textValue.trim(), notes: textValue.trim() });
      return;
    }

    if (item.type === "number") {
      const num = Number(numberValue);
      if (Number.isNaN(num)) {
        setError("Enter a valid number.");
        return;
      }
      onComplete({ value: num });
      return;
    }

    if (item.type === "temperature") {
      const num = Number(tempValue);
      const tempError = validateTemperature(num);
      if (tempError && item.required) {
        setError(tempError);
        return;
      }
      onComplete({
        value: num,
        notes: tempError ?? undefined,
      });
      return;
    }
  };

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        isDone
          ? "border-emerald-200 bg-emerald-50/70 shadow-sm"
          : "border-slate-200/80 bg-white shadow-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            isDone
              ? "bg-emerald-500 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {isDone ? <Check className="h-4 w-4" /> : index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-slate-900">{item.title}</h4>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {taskTypeLabel(item.type)}
            </span>
            {item.required && !isDone && (
              <span className="text-[10px] font-semibold uppercase text-amber-600">
                Required
              </span>
            )}
          </div>

          {item.description && (
            <p className="mt-1 text-sm text-slate-600">{item.description}</p>
          )}

          {item.trainingNote && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{item.trainingNote}</span>
            </div>
          )}

          {isDone && completion ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Completed at {formatTime(completion.completedAt)} by{" "}
                {completion.completedBy}
              </div>
              {completion.value !== undefined &&
                item.type !== "checkbox" &&
                item.type !== "photo" && (
                  <p className="text-sm text-slate-700">
                    Response:{" "}
                    <span className="font-semibold">
                      {String(completion.value)}
                      {item.type === "temperature" ? "°F" : ""}
                    </span>
                  </p>
                )}
              {completion.notes && (
                <p className="text-sm text-amber-700">{completion.notes}</p>
              )}
              {completion.photoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={completion.photoDataUrl}
                  alt="Task proof"
                  className="mt-2 max-h-48 rounded-xl border border-slate-200 object-cover"
                />
              )}
              <button
                type="button"
                onClick={onUndo}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Undo
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {item.type === "checkbox" && (
                <button
                  type="button"
                  onClick={submitValue}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Mark Complete
                </button>
              )}

              {item.type === "yes_no" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onComplete({ value: true })}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => onComplete({ value: false })}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    No
                  </button>
                </div>
              )}

              {item.type === "text" && (
                <>
                  <textarea
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    rows={3}
                    placeholder="Enter notes..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
                  />
                  <button
                    type="button"
                    onClick={submitValue}
                    className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Save
                  </button>
                </>
              )}

              {item.type === "number" && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={numberValue}
                    onChange={(e) => setNumberValue(e.target.value)}
                    placeholder="Enter value"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
                  />
                  <button
                    type="button"
                    onClick={submitValue}
                    className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Save
                  </button>
                </div>
              )}

              {item.type === "temperature" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Thermometer className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        placeholder="°F"
                        className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none ring-brand-500 focus:ring-2"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={submitValue}
                      className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                      Log Temp
                    </button>
                  </div>
                  {item.minTemp !== undefined && item.maxTemp !== undefined && (
                    <p className="text-xs text-slate-500">
                      Acceptable range: {item.minTemp}°F – {item.maxTemp}°F
                    </p>
                  )}
                </div>
              )}

              {item.type === "photo" && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) =>
                      handlePhotoSelect(e.target.files?.[0]).catch(() =>
                        setError("Could not load photo.")
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    <Camera className="h-4 w-4" />
                    Take / Upload Photo
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 text-sm text-amber-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
