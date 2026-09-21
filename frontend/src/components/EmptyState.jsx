import { Inbox } from 'lucide-react'

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There are no items to display at this time.',
  action,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto font-[Inter,sans-serif] ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-[#eff4ff] text-[#4450b7] flex items-center justify-center mb-3.5 shadow-2xs">
        <Icon className="w-7 h-7 stroke-[1.75]" />
      </div>
      <h3 className="text-[16px] font-semibold text-[#0b1c30] tracking-tight font-[Geist,sans-serif]">
        {title}
      </h3>
      <p className="text-[13px] text-[#565e74] mt-1.5 leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
