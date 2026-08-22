import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  onNewRecord: () => void;
}

export function TopBar({ onNewRecord }: TopBarProps) {
  return (
    <div className="flex h-14 items-center justify-between border-b border-border px-7">
      <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        <span className="size-1.5 rounded-full bg-primary" />
        Time Tracker
      </div>
      <Button size="sm" onClick={onNewRecord}>
        <Plus className="size-4" />
        New record
      </Button>
    </div>
  );
}
