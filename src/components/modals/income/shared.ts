// Gemensamma typer för fönstret för fasta inkomster.

/** Vilken vy som visas i inkomstfönstret */
export type ModalSubView = 'details' | 'edit' | 'category-picker' | 'day-picker' | 'similar';

/** Vart en väljare går tillbaka */
export type PickerReturnView = 'details' | 'edit';

export type NavigateSubView = (next: ModalSubView, dir?: 'forward' | 'back') => void;

export type SlideAnimClass = 'animate-slide-in-right' | 'animate-slide-in-left';

export interface IncomeAccountInfo {
  label: string;
  fullNumber: string;
  maskedNumber: string;
}
