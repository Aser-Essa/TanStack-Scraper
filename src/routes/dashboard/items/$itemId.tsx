import { MessageResponse } from '#/components/ai-elements/message'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { getItemById, saveSummaryAndGenerateTagsFn } from '#/data/items'
import { cn } from '#/lib/utils'
import { useCompletion } from '@ai-sdk/react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Clock,
  ExternalLink,
  Loader2,
  Sparkles,
  User,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/dashboard/items/$itemId')({
  component: RouteComponent,
  loader: ({ params }) => getItemById({ data: { id: params.itemId } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title ?? 'Item Details',
      },
      {
        property: 'og:image',
        content: loaderData?.ogImage ?? '',
      },
      { name: 'twitter:title', content: loaderData?.title ?? 'Item Details' },
    ],
  }),
})

function RouteComponent() {
  const item = Route.useLoaderData()

  const [isContentOpen, setIsContentOpen] = useState(false)

  const router = useRouter()

  const { completion, complete, isLoading } = useCompletion({
    api: '/api/ai/summary',
    streamProtocol: 'text',
    initialCompletion: item.summary ? item.summary : undefined,
    body: { itemId: item.id },

    onFinish: async (_prompt, completionText) => {
      await saveSummaryAndGenerateTagsFn({
        data: {
          id: item.id,
          summary: completionText,
        },
      })

      toast.success('Summary generated and saved successfully')
      router.invalidate()
    },

    onError: (error) => {
      toast.error(error.message)
    },
  })

  function handleGenerateSummary() {
    if (!item.content) {
      toast.error('No content available to summary')
      return
    }

    complete(item.content)
  }

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6 w-full ">
        <div className=" flex justify-start w-full">
          <Link
            to="/dashboard/items"
            className={buttonVariants({ variant: 'outline' })}
          >
            <ArrowLeft />
            Go back
          </Link>
        </div>
        {item.ogImage && (
          <div className=" relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
            <img
              className=" w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              src={item.ogImage}
              alt={item.title ?? 'Item Image'}
            />
          </div>
        )}

        <div className=" space-y-3">
          <h1 className=" text-3xl font-bold tracking-tight">
            {item.title ?? 'untitled'}
          </h1>
          <div className=" flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {item.author && (
              <span className=" inline-flex items-center gap-1">
                <User className=" size-3.5" />
                {item.author}
              </span>
            )}

            {item.publishedAt && (
              <span className=" inline-flex items-center gap-1">
                <Calendar className=" size-3.5" />
                {new Date(item.publishedAt).toLocaleDateString('en-US')}
              </span>
            )}

            <span className=" inline-flex items-center gap-1">
              <Clock className=" size-3.5" />
              Saved {new Date(item.createdAt).toLocaleDateString('en-US')}
            </span>
          </div>

          <a
            href={item.url}
            target="_blank"
            className=" text-primary hover:underline inline-flex items-center gap-1 text-sm"
          >
            View Original <ExternalLink className="size-3.5" />
          </a>

          {item.tags.length > 0 && (
            <div className=" flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          )}

          <Card className=" border-primary/20 bg-primary/5">
            <CardContent>
              <div className=" flex items-start justify-between">
                <div className=" flex-1">
                  <h2 className=" text-sm font-semibold uppercase tracking-wide text-primary mb-3">
                    Summary
                  </h2>
                  {completion || item.summary ? (
                    <MessageResponse>{completion}</MessageResponse>
                  ) : (
                    <p className="text-muted-foreground italic">
                      {item.content
                        ? 'No summary yet. Generate one with AI.'
                        : 'No content available to summarize.'}
                    </p>
                  )}
                </div>

                {item.content && !item.summary && (
                  <Button
                    disabled={isLoading}
                    size={'sm'}
                    onClick={handleGenerateSummary}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className=" size-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles />
                        Generate
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {item.content && (
            <Collapsible open={isContentOpen} onOpenChange={setIsContentOpen}>
              <CollapsibleTrigger asChild>
                <Button variant={'outline'} className=" w-full justify-between">
                  <span className=" font-medium">Full Content</span>
                  <ChevronDown
                    className={cn(
                      isContentOpen ? 'rotate-180' : '',
                      'size-4 transition-transform duration-200',
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className=" mt-2">
                  <CardContent>
                    <MessageResponse>{item.content}</MessageResponse>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </>
  )
}
