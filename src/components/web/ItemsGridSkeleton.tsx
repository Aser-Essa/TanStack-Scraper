import { Card, CardHeader } from '../ui/card'
import { Skeleton } from '../ui/skeleton'

export default function ItemsGridSkeleton() {
  const fakeItemsArray = Array.from({ length: 4 }, (_, i) => i)
  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        {fakeItemsArray.map((item) => (
          <Card key={item} className=" overflow-hidden pt-0">
            <Skeleton className=" aspect-video w-full" />
            <CardHeader className="space-y-3">
              <div className=" flex items-center justify-between">
                <Skeleton className=" h-4 w-20 rounded-full" />
                <Skeleton className=" size-8 rounded-md" />
              </div>
              <Skeleton className=" h-6 w-full" />
              <Skeleton className=" h-4 w-40" />
            </CardHeader>
          </Card>
        ))}
      </div>
    </>
  )
}
