export function integerInRange(value: unknown, min: number, max: number, label: string): number {
  const number =
    typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(number) || !Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${label} must be a whole number between ${min} and ${max}.`);
  }
  return number;
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  return error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : fallback;
}

export function validTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
