export const VTUR_INPUT_BASE_CLASS = 'vtur-input';

export function buildVturInputClasses(...parts: Array<string | false | null | undefined>) {
  return [VTUR_INPUT_BASE_CLASS, ...parts].filter(Boolean).join(' ');
}
