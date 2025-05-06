console.log("Counter module loaded", import.meta.hot?.data?.count)
let count = import.meta.hot?.data?.count ?? 0
let interval: NodeJS.Timeout

console.log("Counter module loaded", count)

export function start() {
  console.log("🟢 Counter started")
  interval = setInterval(() => {
    count += 1
    console.log(`Tick ${count}`)

    if (import.meta.hot) {
      import.meta.hot.data.count = count
    }
  }, 1000)
}

export function stop() {
  if (import.meta.hot) {
    import.meta.hot.data.count = count
  }

  clearInterval(interval)
  console.log("🛑 Counter stopped")
}
