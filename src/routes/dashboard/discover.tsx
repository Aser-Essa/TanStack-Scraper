import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Progress } from '#/components/ui/progress'
import { bulkScrapeUrlsFn, searchWebFn } from '#/data/items'
import type { BulkScrapeProgress } from '#/lib/types'
import { searchSchema } from '#/schemas/import'
import { zodResolver } from '@hookform/resolvers/zod'
import type { SearchResultWeb } from '@mendable/firecrawl-js'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2, Search, Sparkles } from 'lucide-react'
import { useState, useTransition } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type z from 'zod'

export const Route = createFileRoute('/dashboard/discover')({
  component: RouteComponent,
})

function RouteComponent() {
  const [isPending, startTransition] = useTransition()
  const [bulkIsPending, startBulkTransition] = useTransition()

  const [searchResults, setSearchResults] = useState<SearchResultWeb[]>()

  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set())
  const isAllSelected = selectedUrls.size === searchResults?.length

  const [progress, setProgress] = useState<BulkScrapeProgress | null>(null)

  function handleSelectAll() {
    if (isAllSelected) {
      setSelectedUrls(new Set())
    } else {
      setSelectedUrls(new Set(searchResults?.map((result) => result.url)))
    }
  }

  function handleToggleUrl(url: string) {
    const newSelected = new Set(selectedUrls)

    if (newSelected.has(url)) {
      newSelected.delete(url)
    } else {
      newSelected.add(url)
    }

    setSelectedUrls(newSelected)
  }

  const { control, handleSubmit } = useForm({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      query: '',
    },
  })

  function onSubmit({ query }: z.infer<typeof searchSchema>) {
    startTransition(async () => {
      const result = await searchWebFn({ data: { query } })
      setSearchResults(result)
    })
  }

  function handleBulkImport() {
    startBulkTransition(async () => {
      if (selectedUrls.size === 0) {
        toast.error('Please select at least one URL to import.')
        return
      }

      setProgress({
        total: selectedUrls.size,
        completed: 0,
        url: '',
        status: 'success',
      })

      let successCount = 0
      let failedCount = 0

      for await (const update of await bulkScrapeUrlsFn({
        data: { urls: Array.from(selectedUrls) },
      })) {
        setProgress(update)

        if (update.status === 'success') {
          successCount++
        } else {
          failedCount++
        }
      }

      if (failedCount > 0) {
        toast.success(`Imported ${successCount} URLs (${failedCount} failed)`)
      } else {
        toast.success(`Successfully imported ${successCount} URLs`)
      }

      setProgress(null)
    })
  }

  return (
    <>
      <div className=" flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-2xl space-y-6 px-4 ">
          <div className=" text-center">
            <h1 className=" font-bold text-3xl">Discover</h1>
            <p className=" text-muted-foreground pt-2">
              Search the web for articles on any topic.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className=" flex items-center gap-2">
                <Sparkles className=" size-5 text-primary" />
                Topic Search
              </CardTitle>
              <CardDescription>
                Search the web for content and import what you find interesting.
              </CardDescription>
            </CardHeader>
            <CardContent className=" space-y-6">
              <form onSubmit={handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Controller
                    name="query"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="query">Query</FieldLabel>

                        <Input
                          {...field}
                          id="query"
                          type="text"
                          aria-invalid={fieldState.invalid}
                          placeholder="e.g. React Server Component tutorial"
                        />

                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <Button disabled={isPending} type="submit">
                    {isPending ? (
                      <>
                        <Loader2 className=" size-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className=" size-4" />
                        Search Web
                      </>
                    )}
                  </Button>
                </FieldGroup>
              </form>

              {searchResults && searchResults.length > 0 && (
                <div className="  space-y-4">
                  <div className=" flex items-center justify-between">
                    <p className=" text-sm font-medium">
                      Found {searchResults.length} URLs
                    </p>

                    <div className=" flex items-center gap-2">
                      <p className=" text-sm font-medium">
                        Selected {selectedUrls.size} of {searchResults.length}
                      </p>

                      <Button
                        variant={'outline'}
                        size={'sm'}
                        onClick={handleSelectAll}
                      >
                        {isAllSelected ? 'Deselect all' : 'Select all'}
                      </Button>
                    </div>
                  </div>

                  <div className=" max-h-80 space-y-2 overflow-y-auto rounded-md border p-4">
                    {searchResults.map((result) => (
                      <label
                        key={result.url}
                        className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-md p-2"
                      >
                        <Checkbox
                          className=" pt-0.5"
                          checked={selectedUrls.has(result.url)}
                          onCheckedChange={() => handleToggleUrl(result.url)}
                        />
                        <div className="min-w-0 flex-1 ">
                          <p className="truncate text-sm font-medium">
                            {result.title ?? 'Title has not been found'}
                          </p>
                          <p className=" truncate  text-muted-foreground text-xs">
                            {result.description ??
                              'Description has not been found'}
                          </p>
                          <p className=" truncate  text-muted-foreground text-xs">
                            {result.url}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {progress && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className=" text-muted-foreground">
                            Importing: {progress.completed} / {progress.total}
                          </span>

                          <span className="font-medium">
                            {Math.round(
                              (progress.completed / progress.total) * 100,
                            )}
                            %
                          </span>
                        </div>
                        <Progress
                          value={(progress.completed / progress.total) * 100}
                        />
                      </div>
                    </>
                  )}

                  <Button
                    onClick={handleBulkImport}
                    disabled={bulkIsPending}
                    className=" w-full "
                    type="button"
                  >
                    {bulkIsPending ? (
                      <>
                        <Loader2 className=" size-4 animate-spin" />{' '}
                        {progress
                          ? `Importing ${progress.completed} / ${progress.total}...`
                          : 'Starting...'}
                      </>
                    ) : (
                      `Import ${selectedUrls.size} URLs`
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
