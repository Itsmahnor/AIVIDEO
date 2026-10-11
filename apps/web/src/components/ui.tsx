import type {ButtonHTMLAttributes, FC, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes} from 'react';
import {cn} from '../lib/utils';

export const Card: FC<{title?: string; hint?: string; children: ReactNode; className?: string}> = ({title, hint, children, className}) => (
  <section className={cn('rounded-xl border border-slate-200 bg-white p-6 shadow-sm', className)}>
    {title ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : null}
    {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    <div className={title ? 'mt-5' : ''}>{children}</div>
  </section>
);

export const Field: FC<{label: string; hint?: string; children: ReactNode; className?: string}> = ({label, hint, children, className}) => (
  <label className={cn('block', className)}>
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    {children}
    {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
  </label>
);

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';

export const TextInput: FC<InputHTMLAttributes<HTMLInputElement>> = ({className, ...props}) => <input className={cn(inputClass, className)} {...props} />;
export const TextArea: FC<TextareaHTMLAttributes<HTMLTextAreaElement>> = ({className, ...props}) => <textarea className={cn(inputClass, 'min-h-[88px]', className)} {...props} />;

export const Select: FC<SelectHTMLAttributes<HTMLSelectElement> & {options: readonly {value: string; label: string}[]}> = ({options, className, ...props}) => (
  <select className={cn(inputClass, className)} {...props}>
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

export const Button: FC<ButtonHTMLAttributes<HTMLButtonElement> & {variant?: 'primary' | 'ghost' | 'danger'}> = ({variant = 'primary', className, ...props}) => (
  <button
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
      variant === 'primary' && 'bg-indigo-600 text-white hover:bg-indigo-700',
      variant === 'ghost' && 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
      variant === 'danger' && 'text-red-600 hover:bg-red-50',
      className,
    )}
    {...props}
  />
);

export const ErrorBox: FC<{messages: string[]}> = ({messages}) =>
  messages.length === 0 ? null : (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <ul className="list-disc space-y-1 pl-5">
        {messages.map((message) => (
          <li key={message} className="whitespace-pre-wrap">
            {message}
          </li>
        ))}
      </ul>
    </div>
  );

export const Pill: FC<{children: ReactNode; tone?: 'green' | 'amber' | 'slate'}> = ({children, tone = 'slate'}) => (
  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', tone === 'green' && 'bg-emerald-100 text-emerald-800', tone === 'amber' && 'bg-amber-100 text-amber-800', tone === 'slate' && 'bg-slate-100 text-slate-700')}>
    {children}
  </span>
);
