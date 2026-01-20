import type { ActivityInput } from '../types';
import { MAX_ACTIVITY_MINUTES, MIN_ACTIVITY_MINUTES, HIGH_DURATION_WARNING_MINUTES } from './time';

export function validateActivityInput(input: ActivityInput) {
  const errors: string[] = [];
  if (!input.title || input.title.trim().length === 0) {
    errors.push('Titolo obbligatorio.');
  }
  if (!Number.isFinite(input.minutes)) {
    errors.push('Minuti non validi.');
  }
  if (!Number.isInteger(input.minutes)) {
    errors.push('Minuti devono essere un numero intero.');
  }
  if (input.minutes < MIN_ACTIVITY_MINUTES || input.minutes > MAX_ACTIVITY_MINUTES) {
    errors.push(`Minuti devono essere tra ${MIN_ACTIVITY_MINUTES} e ${MAX_ACTIVITY_MINUTES}.`);
  }
  return errors;
}

export function getActivityWarnings(input: ActivityInput, targetMinutes: number) {
  const warnings: string[] = [];
  if (input.title && input.title.trim().length > 0 && input.title.trim().length < 4) {
    warnings.push('Titolo molto breve: valuta un titolo piu specifico.');
  }
  if (input.minutes >= HIGH_DURATION_WARNING_MINUTES) {
    warnings.push('Durata elevata: verifica che sia credibile.');
  }
  if (input.minutes > targetMinutes) {
    warnings.push('Minuti oltre il target giornaliero.');
  }
  return warnings;
}
