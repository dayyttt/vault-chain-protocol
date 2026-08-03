import { WarningTriangleIcon } from "@/components/ui/icons";

export function UnofficialCloneBanner() {
  return (
    <div className="sticky top-0 z-50 w-full border-l-4 border-warning bg-warning/10">
      <p className="mx-auto flex max-w-lg items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold tracking-wide text-warning sm:text-sm">
        <WarningTriangleIcon className="h-4 w-4 shrink-0" />
        Unofficial community wrapper — not a bridge, and not verified by the original token team.
      </p>
    </div>
  );
}
