import { Spinner } from '@/components/ui/Skeleton'

export default function MainLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4 text-indigo-600 dark:text-indigo-400" />
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  )
}
