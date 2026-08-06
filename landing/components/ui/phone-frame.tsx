import { cn } from "@/lib/utils";

export function PhoneFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[9/19] w-full max-w-[300px] rounded-[2.75rem] border border-border-strong bg-elevated p-2.5 shadow-[var(--shadow-lg)]",
        className
      )}
    >
      <div className="absolute left-1/2 top-2.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-bg" />
      <div className="relative h-full w-full overflow-hidden rounded-[2.1rem] bg-bg">
        {children}
      </div>
    </div>
  );
}
