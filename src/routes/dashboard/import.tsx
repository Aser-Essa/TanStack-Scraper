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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { bulkScrapeUrlsFn, mapUrlFn, scrapeUrlFn } from '#/data/items'
import { bulkImportSchema, importSchema } from '#/schemas/import'
import { zodResolver } from '@hookform/resolvers/zod'
import type { SearchResultWeb } from '@mendable/firecrawl-js'
import { createFileRoute } from '@tanstack/react-router'
import { Globe, LinkIcon, Loader, Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type z from 'zod'

export const Route = createFileRoute('/dashboard/import')({
  component: RouteComponent,
})

function RouteComponent() {
  const [isPending, startTransition] = useTransition()
  const [bulkIsPending, startBulkTransition] = useTransition()

  const [discoveredLinks, setDiscoveredLinks] = useState<
    Array<SearchResultWeb>
  >([])

  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set())
  const isAllSelected = selectedUrls.size === discoveredLinks.length

  function handleSelectAll() {
    if (isAllSelected) {
      setSelectedUrls(new Set())
    } else {
      setSelectedUrls(new Set(discoveredLinks.map((link) => link.url)))
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

  function handleBulkImport() {
    startBulkTransition(async () => {
      if (selectedUrls.size === 0) {
        toast.error('Please select at least one URL to import.')
        return
      }

      await bulkScrapeUrlsFn({
        data: { urls: Array.from(selectedUrls) },
      })

      toast.success(`Successfully imported ${selectedUrls.size} URLs`)
    })
  }

  const { control, handleSubmit } = useForm<z.infer<typeof importSchema>>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      url: '',
    },
  })

  const { control: bulkControl, handleSubmit: handleBulkSubmit } = useForm<
    z.infer<typeof bulkImportSchema>
  >({
    resolver: zodResolver(bulkImportSchema),
    defaultValues: {
      url: '',
      search: '',
    },
  })

  function onSubmit({ url }: z.infer<typeof importSchema>) {
    startTransition(async () => {
      await scrapeUrlFn({ data: { url } })
      toast.success('URL scraped successfully')
    })
  }

  function onBulkSubmit({ url, search }: z.infer<typeof bulkImportSchema>) {
    startTransition(async () => {
      const data = await mapUrlFn({ data: { url, search } })
      setDiscoveredLinks(data)
    })
  }

  return (
    <div className=" flex flex-1 justify-center items-center py-8">
      <div className=" w-full max-w-2xl space-y-6 px-4">
        <div className=" text-center">
          <h1 className=" text-3xl font-bold">Import Content</h1>
          <p className=" text-muted-foreground pt-1">
            Save web pages to your libary for later reading
          </p>
        </div>

        <Tabs defaultValue="single">
          <TabsList className="w-full grid grid-cols-2 ">
            <TabsTrigger value="single" className="gap-2">
              <LinkIcon className=" size-4" />
              Single URL
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <Globe className=" size-4" />
              Bulk Import
            </TabsTrigger>
          </TabsList>
          <TabsContent value="single">
            <Card>
              <CardHeader>
                <CardTitle>Import Single URL</CardTitle>
                <CardDescription>
                  Scrape and save content from any web app! 👀
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <FieldGroup>
                    <Controller
                      name="url"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="url">URL</FieldLabel>
                          <Input
                            {...field}
                            id="url"
                            type="url"
                            aria-invalid={fieldState.invalid}
                            placeholder="https://example.com"
                            autoComplete="off"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                    <Button type="submit" disabled={isPending}>
                      {isPending ? (
                        <>
                          <Loader className=" size-4 animate-spin" />{' '}
                          Processing...
                        </>
                      ) : (
                        'Import Url'
                      )}
                    </Button>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Import</CardTitle>
                <CardDescription>
                  Discover and import multiple URLs from a website at once 🚀
                </CardDescription>
              </CardHeader>
              <CardContent className=" space-y-6">
                <form onSubmit={handleBulkSubmit(onBulkSubmit)}>
                  <FieldGroup>
                    <Controller
                      name="url"
                      control={bulkControl}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="url">URL</FieldLabel>
                          <Input
                            {...field}
                            id="url"
                            type="url"
                            aria-invalid={fieldState.invalid}
                            placeholder="https://example.com"
                            autoComplete="off"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                    <Controller
                      name="search"
                      control={bulkControl}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="search">
                            Filter (optional)
                          </FieldLabel>
                          <Input
                            {...field}
                            id="search"
                            type="text"
                            aria-invalid={fieldState.invalid}
                            placeholder="e.g. Blog, docs, tutorial"
                            autoComplete="off"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                    <Button type="submit" disabled={isPending}>
                      {isPending ? (
                        <>
                          <Loader className=" size-4 animate-spin" />{' '}
                          Processing...
                        </>
                      ) : (
                        'Import Urls'
                      )}
                    </Button>
                  </FieldGroup>
                </form>

                {discoveredLinks.length > 0 && (
                  <div className="  space-y-4">
                    <div className=" flex items-center justify-between">
                      <p className=" text-sm font-medium">
                        Found {discoveredLinks.length} URLs
                      </p>

                      <div className=" flex items-center gap-2">
                        <p className=" text-sm font-medium">
                          Selected {selectedUrls.size} of{' '}
                          {discoveredLinks.length}
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
                      {discoveredLinks.map((link) => (
                        <label
                          key={link.url}
                          className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-md p-2"
                        >
                          <Checkbox
                            className=" pt-0.5"
                            checked={selectedUrls.has(link.url)}
                            onCheckedChange={() => handleToggleUrl(link.url)}
                          />
                          <div className="min-w-0 flex-1 ">
                            <p className="truncate text-sm font-medium">
                              {link.title ?? 'Title has not been found'}
                            </p>
                            <p className=" truncate  text-muted-foreground text-xs">
                              {link.description ??
                                'Description has not been found'}
                            </p>
                            <p className=" truncate  text-muted-foreground text-xs">
                              {link.url}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>

                    <Button
                      onClick={handleBulkImport}
                      disabled={bulkIsPending}
                      className=" w-full "
                      type="button"
                    >
                      {bulkIsPending ? (
                        <>
                          <Loader2 className=" size-4 animate-spin" />{' '}
                          Importing...
                        </>
                      ) : (
                        `Import ${selectedUrls.size} URLs`
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
