export function assertIsDefined<T>(
  value: T | undefined,
  errorMessage?: string,
): asserts value is T {
  if (value !== undefined) return
  throw new Error(errorMessage ?? "Unexpected undefined value")
}
