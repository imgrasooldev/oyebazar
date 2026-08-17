import type { Logger } from '@oyebazar/core'

/** Structured JSON logs — Fly.io par grep-able. */
export class ConsoleLogger implements Logger {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(JSON.stringify({ level: 'info', service: 'worker', message, ...meta }))
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(JSON.stringify({ level: 'warn', service: 'worker', message, ...meta }))
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(JSON.stringify({ level: 'error', service: 'worker', message, ...meta }))
  }
}
