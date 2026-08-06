import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-[var(--shadow-md)] hover:bg-accent-deep hover:shadow-[var(--shadow-lg)] active:scale-[0.98]",
  secondary:
    "bg-elevated text-ink-1 border border-border hover:border-border-strong hover:bg-accent-soft active:scale-[0.98]",
  ghost: "text-ink-2 hover:text-ink-1 hover:bg-accent-soft",
};

const sizeClasses: Record<Size, string> = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 ease-[var(--ease-premium)] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2";

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
};

export function Button({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  external,
  ...rest
}: ButtonProps) {
  const classes = cn(base, variantClasses[variant], sizeClasses[size], className);

  if (href) {
    if (external || href.startsWith("http")) {
      return (
        <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={rest.type ?? "button"} className={classes} {...rest}>
      {children}
    </button>
  );
}
