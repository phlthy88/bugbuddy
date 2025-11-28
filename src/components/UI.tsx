// ============================================================
// BugBuddy UI Components
// ============================================================

import React, { forwardRef, useId } from 'react';
import { cx } from '../utils';

// ============================================================
// Button Component
// ============================================================

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'subtle' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-sky-500 text-slate-950 hover:bg-sky-400 focus:ring-sky-500/50 disabled:bg-sky-500/50',
  secondary:
    'bg-slate-900/50 text-slate-200 border border-slate-700 hover:bg-slate-800 focus:ring-slate-500/50',
  danger:
    'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500/50 disabled:bg-red-600/50',
  subtle:
    'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 focus:ring-slate-500/50',
  ghost:
    'bg-transparent text-slate-300 hover:bg-slate-900/30 focus:ring-slate-500/50',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-2.5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cx(
          'inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950',
          'disabled:cursor-not-allowed disabled:opacity-60',
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <LoadingSpinner size={size === 'sm' ? 12 : 16} />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ============================================================
// Loading Spinner
// ============================================================

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export function LoadingSpinner({ size = 16, className }: LoadingSpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cx('animate-spin', className)}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-75"
      />
    </svg>
  );
}

// ============================================================
// Pill / Badge Component
// ============================================================

export type PillTone = 'green' | 'red' | 'yellow' | 'blue' | 'slate' | 'emerald';

interface PillProps {
  tone?: PillTone;
  children: React.ReactNode;
  className?: string;
}

const pillTones: Record<PillTone, string> = {
  green: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50',
  red: 'bg-red-950/50 text-red-300 border-red-800/50',
  yellow: 'bg-amber-950/50 text-amber-300 border-amber-800/50',
  blue: 'bg-sky-950/50 text-sky-300 border-sky-800/50',
  slate: 'bg-slate-900/50 text-slate-300 border-slate-700/50',
  emerald: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50',
};

export function Pill({ tone = 'slate', children, className }: PillProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        pillTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// ============================================================
// Progress Bar
// ============================================================

interface ProgressProps {
  value: number;
  max: number;
  label?: string;
  showPercent?: boolean;
  className?: string;
}

export function Progress({
  value,
  max,
  label,
  showPercent = true,
  className,
}: ProgressProps) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className={className}>
      {(label || showPercent) && (
        <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
          {label && <span>{label}</span>}
          {showPercent && (
            <span>
              {value}/{max} ({percent}%)
            </span>
          )}
        </div>
      )}
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div
          className="h-full rounded-full bg-sky-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================
// Textarea Component
// ============================================================

interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  helper?: string;
  error?: string;
  mono?: boolean;
  onChange?: (value: string) => void;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helper, error, mono, onChange, className, id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const helperId = `${textareaId}-helper`;
    const errorId = `${textareaId}-error`;

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-semibold text-slate-200"
          >
            {label}
          </label>
        )}
        {helper && (
          <p id={helperId} className="text-xs text-slate-400">
            {helper}
          </p>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-describedby={
            [helper && helperId, error && errorId].filter(Boolean).join(' ') ||
            undefined
          }
          aria-invalid={!!error}
          onChange={(e) => onChange?.(e.target.value)}
          className={cx(
            'w-full rounded-xl border bg-slate-950/70 px-3 py-2 text-sm text-slate-100',
            'outline-none transition-colors',
            'focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/15',
            'placeholder:text-slate-500',
            error ? 'border-red-500' : 'border-slate-800',
            mono && 'font-mono',
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// ============================================================
// Input Component
// ============================================================

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  helper?: string;
  error?: string;
  onChange?: (value: string) => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helper, error, onChange, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-slate-200"
          >
            {label}
          </label>
        )}
        {helper && <p className="text-xs text-slate-400">{helper}</p>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          onChange={(e) => onChange?.(e.target.value)}
          className={cx(
            'w-full rounded-xl border bg-slate-950/70 px-3 py-2 text-sm text-slate-100',
            'outline-none transition-colors',
            'focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/15',
            'placeholder:text-slate-500',
            error ? 'border-red-500' : 'border-slate-800',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ============================================================
// Select Component
// ============================================================

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps
  extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    'onChange' | 'value'
  > {
  label?: string;
  helper?: string;
  error?: string;
  options: readonly SelectOption[];
  value: string;
  onChange: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, helper, error, options, value, onChange, className, id, ...props },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-semibold text-slate-200"
          >
            {label}
          </label>
        )}
        {helper && <p className="text-xs text-slate-400">{helper}</p>}
        <select
          ref={ref}
          id={selectId}
          value={value}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
          className={cx(
            'w-full rounded-xl border bg-slate-950/70 px-3 py-2 text-sm text-slate-100',
            'outline-none transition-colors cursor-pointer',
            'focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/15',
            error ? 'border-red-500' : 'border-slate-800',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

// ============================================================
// Checkbox Component
// ============================================================

interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({
  label,
  checked,
  onChange,
  className,
  id,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id || generatedId;

  return (
    <label
      htmlFor={checkboxId}
      className={cx(
        'inline-flex cursor-pointer items-center gap-2',
        className
      )}
    >
      <input
        type="checkbox"
        id={checkboxId}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/50"
        {...props}
      />
      <span className="text-sm text-slate-200">{label}</span>
    </label>
  );
}

// ============================================================
// Card Component
// ============================================================

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const cardPadding: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({ children, className, padding = 'md' }: CardProps) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-slate-800 bg-slate-950/60 shadow-soft',
        cardPadding[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================
// Card Header Component
// ============================================================

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        {description && (
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        )}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

// ============================================================
// Empty State Component
// ============================================================

interface EmptyStateProps {
  title?: string;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 text-center">
      {title && (
        <h4 className="mb-1 text-sm font-semibold text-slate-200">{title}</h4>
      )}
      <p className="text-sm text-slate-400">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ============================================================
// Confirmation Dialog
// ============================================================

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <h2
          id="dialog-title"
          className="text-lg font-semibold text-slate-100"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-400">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
