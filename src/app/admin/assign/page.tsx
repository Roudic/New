"use client";

import { Suspense } from "react";
import AssignChecklistForm from "./AssignChecklistForm";

export default function AssignChecklistPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
          Loading...
        </div>
      }
    >
      <AssignChecklistForm />
    </Suspense>
  );
}
