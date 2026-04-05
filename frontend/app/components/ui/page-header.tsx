import { type LucideIcon } from "lucide-react"

interface PageHeaderProps {
  icon?: LucideIcon
  title: string
  description?: string
  children?: React.ReactNode // action slot
}

export function PageHeader({ icon: Icon, title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-[var(--color-accent-primary)]/10 flex items-center justify-center">
              <Icon size={20} className="text-[var(--color-accent-primary)]" />
            </div>
          )}
          {title}
        </h1>
        {description && (
          <p className="text-[var(--color-text-secondary)] mt-2 text-sm ml-0">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
