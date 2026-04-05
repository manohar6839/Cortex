import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "card" | "circle" | "rect"
  width?: string
  height?: string
}

export function Skeleton({ className, variant = "text", width, height, ...props }: SkeletonProps) {
  const variants = {
    text: "h-4 w-full rounded-md",
    card: "h-32 w-full rounded-xl",
    circle: "h-10 w-10 rounded-full",
    rect: "rounded-xl",
  }

  return (
    <div
      className={cn("skeleton", variants[variant], className)}
      style={{ width, height }}
      {...props}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-4 flex items-center gap-3">
          <Skeleton variant="circle" className="h-8 w-8" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
