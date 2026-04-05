import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, icon, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="text-[var(--color-accent-primary)]">{icon}</div>
        )}
        <div>
          <h1 className="text-2xl font-display text-[var(--color-text-primary)]">{title}</h1>
          {description && (
            <p className="text-[var(--color-text-secondary)] mt-1 font-body">{description}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
