'use client'

import { useState } from 'react'
import type { GuideYouTubeVideo } from '@/types/prepare'

interface YouTubeEmbedProps {
  video: GuideYouTubeVideo
}

export default function YouTubeEmbed({ video }: YouTubeEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {!isLoaded ? (
        // Thumbnail with play button (lazy load pattern)
        <button
          onClick={() => setIsLoaded(true)}
          className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 group"
        >
          {video.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white ms-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </button>
      ) : (
        // Actual embed
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1`}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{video.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{video.channelTitle}</p>
      </div>
    </div>
  )
}
