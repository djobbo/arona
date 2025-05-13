export const debounce = <T extends unknown[], ReturnType>(
  fn: (...args: T) => ReturnType,
  ms = 300,
) => {
  let timeoutId: Timer | undefined
  return (...args: T) =>
    new Promise<ReturnType>((resolve, reject) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(async () => {
        try {
          resolve(await fn(...args))
        } catch (error) {
          reject(error)
        }
      }, ms)
    })
}
