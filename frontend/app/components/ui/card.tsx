import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: "primary" | "secondary" | "none"
  variant?: "default" | "light" | "stat"
}

export function Card({ className, glow = "none", variant = "default", children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "transition-all duration-300",
        variant === "default" && "glass-card p-6",
        variant === "light" && "glass-card-light p-5",
        variant === "stat" && "glass-card p-5",
        glow === "primary" && "hover:shadow-lg hover:shadow-[var(--color-accent-primary)]/8",
        glow === "secondary" && "hover:shadow-lg hover:shadow-[var(--color-accent-secondary)]/8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-5", className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-base font-semibold text-[var(--color-text-primary)]", className)} {...props}>
      {children}
    </h3>
  )
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  )
}
