import { Ratelimit, type Duration } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"

type RateLimitConfig = {
  key: string
  limit: number
  window: Duration
  identifier?: string | null
}

let redisClient: Redis | null = null
const limiters = new Map<string, Ratelimit>()

function getRedis() {
  if (redisClient) return redisClient

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    return null
  }

  redisClient = new Redis({ url, token })
  return redisClient
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown"
  }

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  )
}

function getLimiter(config: RateLimitConfig) {
  const redis = getRedis()
  if (!redis) return null

  const limiterKey = `${config.key}:${config.limit}:${config.window}`
  const existing = limiters.get(limiterKey)
  if (existing) return existing

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.limit, config.window),
    analytics: true,
    prefix: `lexora:${config.key}`,
  })

  limiters.set(limiterKey, limiter)
  return limiter
}

export async function enforceRateLimit(request: Request, config: RateLimitConfig) {
  const limiter = getLimiter(config)

  if (!limiter) {
    return null
  }

  const identity = config.identifier?.trim() || getClientIp(request)
  const result = await limiter.limit(identity)

  if (result.success) {
    return null
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((result.reset - Date.now()) / 1000)
  )

  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
      },
    }
  )
}
