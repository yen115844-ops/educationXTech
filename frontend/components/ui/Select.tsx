'use client';

import { forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

const formControlBase =
  'h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-500';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  options: SelectOption[];
  className?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, className = '', ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`${formControlBase} ${className}`.trim()}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
);
Select.displayName = 'Select';

export default Select;
