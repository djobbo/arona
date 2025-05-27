export function debounce<T extends unknown[], R>(
	fn: (...args: T) => Promise<R> | R,
	delay = 300,
): (...args: T) => Promise<R> {
	let timeoutId: ReturnType<typeof setTimeout> | undefined

	return (...args: T): Promise<R> => {
		return new Promise((resolve, reject) => {
			if (timeoutId) clearTimeout(timeoutId)

			timeoutId = setTimeout(async () => {
				try {
					const result = await fn(...args)
					resolve(result)
				} catch (error) {
					reject(error)
				}
			}, delay)
		})
	}
}
