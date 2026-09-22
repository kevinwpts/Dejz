import React, { useState } from 'react';

import { ChevronDown } from 'lucide-react';

interface CollapsibleCardProps {
  icon: React.ReactNode;
  title: string;
  teaser: string;
  children: React.ReactNode;
  className?: string;
  initiallyExpanded?: boolean;
}

export function CollapsibleCard({ icon, title, teaser, children, className, initiallyExpanded = false }: CollapsibleCardProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  return (
    <div className={`rounded-2xl p-4 ${className}`}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 w-full"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
          {!isExpanded && <p className="text-xs text-[var(--text-secondary)] truncate">{teaser}</p>}
        </div>
        <ChevronDown size={16} className={`text-[var(--text-secondary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      <div>
        {isExpanded && (
          <div
            
            className="overflow-hidden"
          >
            <div className="pt-4">
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
