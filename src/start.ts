import { createStart, createMiddleware } from '@tanstack/react-start'
import { authMiddleware } from './middlewares/auth'

const loggingMiddleware = createMiddleware({ type: 'request' }).server(
  async ({ request, next }) => {
    const url = new URL(request.url)
    console.log(`[${request.method}] , ${url.pathname}`)
    return next()
  },
)

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [loggingMiddleware, authMiddleware],
  }
})
