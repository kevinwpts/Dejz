import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from './Icon';

export interface SmartInputFeedbackData {
  type: 'success' | 'error';
  message: string;
}

export interface SmartInputLabelProps {
  label?: string;
  isProcessing?: boolean;
  className?: string;
}

/**
 * Reusable visual signature label for Dejz smart natural-language inputs.
 * Displays a subtle Dejz green (#05B862) sparkle symbol with smooth, subtle processing animation.
 */
export const SmartInputLabel: React.FC<SmartInputLabelProps> = ({
  label,
  isProcessing = false,
  className = '',
}) => {
  if (!label) return null;
  return (
    <div className={`flex items-center gap-1.5 px-0.5 select-none ${className}`}>
      <motion.span
        className="inline-flex items-center text-[var(--accent-color)] shrink-0"
        animate={
          isProcessing
            ? {
                scale: [1, 1.22, 1],
                rotate: [0, 18, -12, 0],
              }
            : { scale: 1, rotate: 0 }
        }
        transition={
          isProcessing
            ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.2 }
        }
      >
        <Icon name="sparkles" size={13} className="text-[var(--accent-color)]" />
      </motion.span>
      <span className="text-label font-medium text-[var(--text-secondary)]">
        {label}
      </span>
    </div>
  );
};

export interface SmartInputFeedbackProps {
  feedback?: SmartInputFeedbackData | null;
  className?: string;
}

/**
 * Discreet confirmation feedback for smart inputs.
 * Short, clean, visually secondary with a green checkmark. No sparkle icons or verbose repeats.
 */
export const SmartInputFeedback: React.FC<SmartInputFeedbackProps> = ({
  feedback,
  className = '',
}) => {
  if (!feedback) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -2 }}
        transition={{ duration: 0.15 }}
        className={`flex items-center gap-1.5 text-micro-label font-medium px-1 py-0.5 select-none ${
          feedback.type === 'success'
            ? 'text-[var(--text-secondary)]'
            : 'text-[var(--danger-color)]'
        } ${className}`}
      >
        {feedback.type === 'success' && (
          <Icon name="check" size={12} className="text-[var(--success-color)] shrink-0" />
        )}
        <span>{feedback.message}</span>
      </motion.div>
    </AnimatePresence>
  );
};

export interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (e?: React.FormEvent) => void;
  label?: string;
  hideLabel?: boolean;
  placeholder?: string;
  isProcessing?: boolean;
  disabled?: boolean;
  leftElement?: React.ReactNode;
  submitVariant?: 'inline' | 'inside' | 'none';
  submitText?: string;
  submitIcon?: React.ReactNode;
  submitButtonClassName?: string;
  submitTitle?: string;
  submitAriaLabel?: string;
  allowSubmitWhenEmpty?: boolean;
  feedback?: SmartInputFeedbackData | null;
  onClear?: () => void;
  autoFocus?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  className?: string;
  wrapperClassName?: string;
  inputClassName?: string;
  name?: string;
  id?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Global reusable SmartInput component for Dejz natural-language & AI-assisted inputs.
 * Adheres to Dejz Design System:
 * - Subtle #05B862 sparkle signature label
 * - Gentle processing animation
 * - Clean input field styling without AI-slop gradients
 * - Inline or inside submit button support
 * - Discreet, secondary confirmation feedback
 */
export const SmartInput: React.FC<SmartInputProps> = ({
  value,
  onChange,
  onSubmit,
  label,
  hideLabel = false,
  placeholder,
  isProcessing = false,
  disabled = false,
  leftElement,
  submitVariant = 'inline',
  submitText = 'Lägg till',
  submitIcon,
  submitButtonClassName = '',
  submitTitle,
  submitAriaLabel,
  allowSubmitWhenEmpty = false,
  feedback,
  onClear,
  autoFocus,
  inputRef,
  className = '',
  wrapperClassName = '',
  inputClassName = '',
  name,
  id,
  onKeyDown,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!value.trim() && !allowSubmitWhenEmpty) || isProcessing || disabled) return;
    if (onSubmit) onSubmit(e);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChange('');
    }
  };

  const hasInsideSubmit = submitVariant === 'inside';
  const hasInlineSubmit = submitVariant === 'inline';

  return (
    <div className={`space-y-1.5 w-full ${wrapperClassName}`}>
      {/* Signature Sparkle Header */}
      {!hideLabel && (
        <SmartInputLabel label={label} isProcessing={isProcessing} />
      )}

      {/* Input Row / Form */}
      <form onSubmit={handleSubmit} className={`flex items-center gap-2 ${className}`}>
        <div className="relative flex-1 flex items-center">
          {/* Optional Left Element (e.g. Mic or action button) */}
          {leftElement && (
            <div className="absolute left-2 z-10 flex items-center justify-center">
              {leftElement}
            </div>
          )}

          {/* Text Input Field */}
          <input
            ref={inputRef}
            id={id}
            name={name}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled || isProcessing}
            autoFocus={autoFocus}
            className={`w-full min-h-[48px] bg-[var(--surface-input)] border border-transparent focus:border-[var(--accent-color)] rounded-[10px] text-body text-[var(--text-primary)] placeholder:font-normal placeholder:text-[var(--text-tertiary)] outline-none transition-colors shadow-none ${
              leftElement ? 'pl-13 sm:pl-15' : 'px-3.5'
            } ${
              hasInsideSubmit ? (value && !isProcessing ? 'pr-22 sm:pr-24' : 'pr-13 sm:pr-15') : (value && !isProcessing ? 'pr-9' : 'pr-3.5')
            } py-3 disabled:opacity-50 disabled:cursor-not-allowed ${inputClassName}`}
          />

          {/* Clear Button */}
          {value && !isProcessing && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Rensa"
              className={`absolute top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-2 cursor-pointer transition-colors z-10 ${
                hasInsideSubmit ? 'right-12 sm:right-13.5' : 'right-2.5'
              }`}
            >
              <Icon name="x" size={16} />
            </button>
          )}

          {/* Inside Submit Button */}
          {hasInsideSubmit && (
            <button
              type="submit"
              title={submitTitle || (isProcessing ? 'Bearbetar...' : submitText)}
              aria-label={submitAriaLabel || (isProcessing ? 'Bearbetar...' : submitText)}
              disabled={(!value.trim() && !allowSubmitWhenEmpty) || isProcessing || disabled}
              className={`absolute right-2 z-10 w-10 h-10 rounded-[8px] ${
                submitButtonClassName || 'bg-[var(--accent-color)] text-[var(--on-accent)] border border-[var(--accent-color)]'
              } hover:opacity-90 disabled:opacity-30 active:scale-95 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shadow-none`}
            >
              {isProcessing ? (
                <Icon name="spinner" size={16} className="animate-spin" />
              ) : (
                submitIcon || <Icon name="check" size={16} />
              )}
            </button>
          )}
        </div>

        {/* Inline Submit Button */}
        {hasInlineSubmit && (
          <button
            type="submit"
            disabled={!value.trim() || isProcessing || disabled}
            className="min-h-[48px] px-4 rounded-[10px] bg-[var(--accent-color)] text-[var(--on-accent)] text-button flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer shadow-none active:scale-95 shrink-0"
          >
            {isProcessing ? (
              <Icon name="spinner" size={16} className="animate-spin" />
            ) : (
              <span>{submitText}</span>
            )}
          </button>
        )}
      </form>

      {/* Discreet Secondary Feedback */}
      <SmartInputFeedback feedback={feedback} />
    </div>
  );
};
