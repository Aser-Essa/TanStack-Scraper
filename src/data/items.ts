import { prisma } from '#/db'
import type { SavedItem } from '#/generated/prisma/client'
import { firecrawl } from '#/lib/firecrawl'
import { authFnMiddleware } from '#/middlewares/auth'
import {
  bulkImportSchema,
  extractSchema,
  importSchema,
  searchSchema,
} from '#/schemas/import'
import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import z from 'zod'
import { generateText } from 'ai'
import { openrouter } from '#/lib/openRouter'
import type { SearchResultWeb } from '@mendable/firecrawl-js'
import type { BulkScrapeProgress } from '#/lib/types'

export const scrapeUrlFn = createServerFn({
  method: 'POST',
})
  .middleware([authFnMiddleware])
  .inputValidator(importSchema)
  .handler(async ({ data, context }) => {
    const { user } = context.session

    const item = await prisma.savedItem.create({
      data: {
        url: data.url,
        userId: user.id,
        status: 'PROCESSING',
      },
    })

    try {
      const result = await firecrawl.scrape(data.url, {
        formats: [
          'markdown',
          {
            type: 'json',
            schema: extractSchema,
          },
        ],
        location: {
          country: 'US',
          languages: ['en'],
        },
        onlyMainContent: true,
      })

      const jsonData = result.json as z.infer<typeof extractSchema>

      let publishedAt = null

      if (jsonData.publishedAt) {
        const parsed = new Date(jsonData.publishedAt)

        if (!isNaN(parsed.getTime())) {
          publishedAt = parsed
        }
      }

      const updatedItem = await prisma.savedItem.update({
        where: {
          id: item.id,
        },
        data: {
          title: result.metadata?.title || null,
          content: result.markdown || null,
          ogImage: result.metadata?.ogImage || null,
          author: jsonData.author || null,
          publishedAt: publishedAt,
          status: 'COMPLETED',
        },
      })

      return updatedItem
    } catch {
      const failedItem = await prisma.savedItem.update({
        where: {
          id: item.id,
        },
        data: {
          status: 'FAILED',
        },
      })

      return failedItem
    }
  })

export const mapUrlFn = createServerFn({ method: 'POST' })
  .middleware([authFnMiddleware])
  .inputValidator(bulkImportSchema)
  .handler(async ({ data }) => {
    const result = await firecrawl.map(data.url, {
      limit: 25,
      search: data.search,
      location: {
        country: 'US',
        languages: ['en'],
      },
    })
    return result.links
  })

export const bulkScrapeUrlsFn = createServerFn({ method: 'POST' })
  .middleware([authFnMiddleware])
  .inputValidator(
    z.object({
      urls: z.array(z.string().url()),
    }),
  )
  .handler(async function* ({ data, context }) {
    const total = data.urls.length

    const { user } = context.session

    for (const [i, url] of data.urls.entries()) {
      const item = await prisma.savedItem.create({
        data: {
          url,
          userId: user.id,
          status: 'PENDING',
        },
      })

      let status: BulkScrapeProgress['status'] = 'success'

      try {
        const result = await firecrawl.scrape(url, {
          formats: [
            'markdown',
            {
              type: 'json',
              schema: extractSchema,
            },
          ],
          location: {
            country: 'US',
            languages: ['en'],
          },
          onlyMainContent: true,
          proxy: 'auto',
        })

        const jsonData = result.json as z.infer<typeof extractSchema>

        let publishedAt = null

        if (jsonData.publishedAt) {
          const parsed = new Date(jsonData.publishedAt)

          if (!isNaN(parsed.getTime())) {
            publishedAt = parsed
          }
        }

        await prisma.savedItem.update({
          where: {
            id: item.id,
          },
          data: {
            title: result.metadata?.title || null,
            content: result.markdown || null,
            ogImage: result.metadata?.ogImage || null,
            author: jsonData.author || null,
            publishedAt: publishedAt,
            status: 'COMPLETED',
          },
        })

        const progress: BulkScrapeProgress = {
          completed: i + 1,
          total,
          url,
          status,
        }

        yield progress
      } catch {
        status = 'failed'
        await prisma.savedItem.update({
          where: {
            id: item.id,
          },
          data: {
            status: 'FAILED',
          },
        })

        const progress: BulkScrapeProgress = {
          completed: i + 1,
          total,
          url,
          status,
        }

        yield progress
      }
    }
  })

export const getItemsFn = createServerFn({ method: 'GET' })
  .middleware([authFnMiddleware])
  .handler(async ({ context }): Promise<SavedItem[]> => {
    const { user } = context.session

    const items = await prisma.savedItem.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return items
  })

export const getItemById = createServerFn({ method: 'GET' })
  .middleware([authFnMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const item = await prisma.savedItem.findUnique({
      where: {
        userId: context.session.user.id,
        id: data.id,
      },
    })

    if (!item) {
      throw notFound()
    }

    return item
  })

export const saveSummaryAndGenerateTagsFn = createServerFn({
  method: 'POST',
})
  .middleware([authFnMiddleware])
  .inputValidator(
    z.object({
      id: z.string(),
      summary: z.string(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { user } = context.session

    const existing = await prisma.savedItem.findUnique({
      where: {
        id: data.id,
        userId: user.id,
      },
    })

    if (!existing) {
      throw notFound()
    }

    const { text } = await generateText({
      model: openrouter.chat('xiaomi/mimo-v2-flash'),
      system: `You are a helpful assistant that extracts relevant tags from content summaries.
                Extract 3-5 short, relevant tags that categorize the content.
                Return ONLY a comma-separated list of tags, nothing else.
                Example: technology, programming, web development, javascript`,
      prompt: `Extract tags from this summary: \n\n${data.summary}`,
    })

    const tags = text
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0)
      .slice(0, 5)

    const item = await prisma.savedItem.update({
      where: {
        id: data.id,
        userId: user.id,
      },
      data: {
        summary: data.summary,
        tags: tags,
      },
    })

    return item
  })

export const searchWebFn = createServerFn({
  method: 'POST',
})
  .middleware([authFnMiddleware])
  .inputValidator(searchSchema)
  .handler(async ({ data }) => {
    const results = await firecrawl.search(data.query, {
      limit: 15,
      location: 'Germany',
      tbs: 'qdr:y',
    })

    return results.web?.map((item) => ({
      url: (item as SearchResultWeb).url,
      title: (item as SearchResultWeb).title,
      description: (item as SearchResultWeb).description,
    }))
  })
