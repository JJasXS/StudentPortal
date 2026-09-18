interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500 [overflow-wrap:anywhere]">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full min-w-0 shrink-0 flex-wrap items-end gap-2 sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
