import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card, CardHeader, CardTitle } from '#/components/ui/card'
import type { getItemsFn } from '#/data/items'
import { copyToClipboard } from '#/lib/clipboard'
import type { itemsSearchSchema } from '#/schemas/items'
import { Link } from '@tanstack/react-router'
import { Copy, Inbox } from 'lucide-react'
import type z from 'zod'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../ui/empty'

type ItemsSearch = z.infer<typeof itemsSearchSchema>

type ItemsListProps = {
  q: ItemsSearch['q']
  status: ItemsSearch['status']
  data: Awaited<ReturnType<typeof getItemsFn>>
}

export default function ItemsList({ data, q, status }: ItemsListProps) {
  const filteredItems = data.filter((item) => {
    const matchQuery =
      q === '' ||
      item.title?.toLowerCase().includes(q.toLowerCase()) ||
      item.tags.some((tag) => tag.toLowerCase().includes(q.toLowerCase()))

    const matchStatus = status === 'all' || item.status === status

    return matchQuery && matchStatus
  })

  if (filteredItems.length === 0) {
    return (
      <>
        <Empty className=" border rounded-lg h-full ">
          <EmptyHeader>
            <EmptyMedia variant={'icon'}>
              <Inbox className=" size-12" />
            </EmptyMedia>
            <EmptyTitle>
              {data.length === 0 ? 'No Items saved yet' : 'No Items found'}
            </EmptyTitle>
            <EmptyDescription>
              {data.length === 0
                ? 'Import a URL to get started with saving your content.'
                : 'No items match your current search filters.'}
            </EmptyDescription>
          </EmptyHeader>
          {data.length === 0 && (
            <EmptyContent>
              <Link className={buttonVariants()} to="/dashboard/import">
                Import URL
              </Link>
            </EmptyContent>
          )}
        </Empty>
      </>
    )
  }

  return (
    <>
      <div className=" grid  gap-6 md:grid-cols-2">
        {filteredItems.map((item) => (
          <Card
            key={item.id}
            className=" overflow-hidden group transition-all hover:shadow-lg pt-0"
          >
            <Link to="/dashboard" className=" block">
              {item.ogImage && (
                <div className=" aspect-video w-full overflow-hidden  bg-muted">
                  <img
                    src={item.ogImage}
                    alt={item.title ?? 'Article Thumbnail'}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              )}
              <CardHeader className=" space-y-3 pt-4 ">
                <div className=" flex items-center justify-between gap-2">
                  <Badge
                    variant={
                      item.status === 'COMPLETED' ? 'default' : 'secondary'
                    }
                  >
                    {item.status.toLocaleLowerCase()}
                  </Badge>
                  <Button
                    onClick={async (e) => {
                      e.preventDefault()
                      await copyToClipboard(item.url)
                    }}
                    variant={'outline'}
                    size={'icon'}
                    className=" size-8"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
                <CardTitle className=" line-clamp-1 text-xl leading-snug group-hover:text-primary transition-colors">
                  {item.title}
                </CardTitle>
                {item.author && (
                  <p className=" text-xs text-muted-foreground ">
                    {item.author}
                  </p>
                )}
              </CardHeader>
            </Link>
          </Card>
        ))}
      </div>
    </>
  )
}
