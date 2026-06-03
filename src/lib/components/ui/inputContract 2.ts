export const VTUR_INPUT_BASE_CLASS = 'vtur-input';

export function buildVturInputClasses(...parts: Array<string | false | null | undefined>) {
  let classes = VTUR_INPUT_BASE_CLASS;
  for (const part of parts) {
    if (part) classes += ` ${part}`;
  }
  return classes;
}
