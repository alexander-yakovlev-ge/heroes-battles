import { Worker } from 'node:worker_threads'

/** Раздаёт задачи пачками воркерам (тот же файл-скрипт в режиме worker), собирает результаты */
export function runParallel(workerUrl, tasks, count, workerData = {}) {
  const CHUNK = 10
  const chunks = []
  for (let i = 0; i < tasks.length; i += CHUNK) chunks.push(tasks.slice(i, i + CHUNK))
  const results = []
  let next = 0
  let done = 0
  return new Promise((resolve, reject) => {
    const pool = Array.from({ length: Math.min(count, chunks.length) }, () => new Worker(workerUrl, { workerData }))
    const feed = (w) => {
      if (next < chunks.length) w.postMessage(chunks[next++])
      else w.terminate()
    }
    for (const w of pool) {
      w.on('message', (out) => {
        results.push(...out)
        done++
        if (process.stderr.isTTY) process.stderr.write(`\r${done}/${chunks.length}`)
        if (done === chunks.length) {
          if (process.stderr.isTTY) process.stderr.write('\r\x1b[K')
          resolve(results)
        }
        feed(w)
      })
      w.on('error', reject)
      feed(w)
    }
  })
}
