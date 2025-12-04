'use client'

import { Step } from '@/types'
import Image from 'next/image'
import { useState } from 'react'

interface StepContentProps {
  step: Step
  lessonTitle: string
}

export default function StepContent({ step, lessonTitle }: StepContentProps) {
  const imageProps = {
    imageUrl: step.imageUrl,
    imageAlt: step.imageAlt,
    imageCaption: step.imageCaption,
    imageCredit: step.imageCredit,
    imageCreditUrl: step.imageCreditUrl,
  }

  switch (step.type) {
    case 'explanation':
      return <ExplanationStep content={step.content} {...imageProps} />
    case 'key_point':
      return <KeyPointStep content={step.content} />
    case 'formula':
      return <FormulaStep content={step.content} explanation={step.explanation} />
    case 'diagram':
      return <DiagramStep content={step.content} {...imageProps} />
    case 'example':
      return <ExampleStep content={step.content} {...imageProps} />
    case 'summary':
      return <SummaryStep content={step.content} lessonTitle={lessonTitle} />
    case 'question':
      // Questions are handled separately in the parent component
      return null
    default:
      return <ExplanationStep content={step.content} {...imageProps} />
  }
}

interface StepImageProps {
  url: string
  alt?: string
  caption?: string
  credit?: string
  creditUrl?: string
}

/**
 * Reusable image component for steps with caption and credit
 */
function StepImage({ url, alt, caption, credit, creditUrl }: StepImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return null // Don't show broken images
  }

  return (
    <figure className="mt-4">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
        <Image
          src={url}
          alt={alt || 'Course image'}
          fill
          className={`object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false)
            setHasError(true)
          }}
          sizes="(max-width: 768px) 100vw, 600px"
        />
      </div>
      {/* Caption and credit */}
      {(caption || credit) && (
        <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
          {caption && <span>{caption}</span>}
          {caption && credit && <span> · </span>}
          {credit && (
            <span>
              Photo by{' '}
              {creditUrl ? (
                <a
                  href={creditUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {credit}
                </a>
              ) : (
                credit
              )}{' '}
              on Unsplash
            </span>
          )}
        </figcaption>
      )}
    </figure>
  )
}

interface ImageStepProps {
  content: string
  imageUrl?: string
  imageAlt?: string
  imageCaption?: string
  imageCredit?: string
  imageCreditUrl?: string
}

function ExplanationStep({ content, imageUrl, imageAlt, imageCaption, imageCredit, imageCreditUrl }: ImageStepProps) {
  return (
    <div className="animate-fadeIn">
      <p className="text-lg sm:text-xl text-gray-800 dark:text-gray-200 leading-relaxed">
        {content}
      </p>
      {imageUrl && <StepImage url={imageUrl} alt={imageAlt} caption={imageCaption} credit={imageCredit} creditUrl={imageCreditUrl} />}
    </div>
  )
}

function KeyPointStep({ content }: { content: string }) {
  return (
    <div className="animate-fadeIn">
      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          {/* Lightbulb icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-amber-400 dark:bg-amber-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2 15H10v-1h4v1zm0-2H10v-1h4v1zm-1.5-3.59V13h-1v-1.59c-1.12-.44-1.96-1.49-1.96-2.73 0-1.62 1.34-2.93 2.99-2.93s2.99 1.31 2.99 2.93c0 1.24-.84 2.29-1.96 2.73h-.06z"/>
            </svg>
          </div>
          <div className="flex-1">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Key Point
            </span>
            <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
              {content}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormulaStep({ content, explanation }: { content: string; explanation?: string }) {
  return (
    <div className="animate-fadeIn space-y-4">
      {/* Formula box */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Formula
          </span>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 font-mono text-lg sm:text-xl text-center text-gray-900 dark:text-white border border-blue-100 dark:border-blue-900">
          {content}
        </div>
      </div>

      {/* Explanation */}
      {explanation && (
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed pl-2 border-l-2 border-blue-300 dark:border-blue-700">
          {explanation}
        </p>
      )}
    </div>
  )
}

function DiagramStep({ content, imageUrl, imageAlt, imageCaption, imageCredit, imageCreditUrl }: ImageStepProps) {
  return (
    <div className="animate-fadeIn">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            {imageUrl ? 'Diagram' : 'Diagram Reference'}
          </span>
        </div>
        <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
          {content}
        </p>
        {imageUrl ? (
          <StepImage url={imageUrl} alt={imageAlt || 'Diagram'} caption={imageCaption} credit={imageCredit} creditUrl={imageCreditUrl} />
        ) : (
          <p className="mt-4 text-sm text-purple-600 dark:text-purple-400 italic">
            Refer to the original notes image for the visual diagram.
          </p>
        )}
      </div>
    </div>
  )
}

function ExampleStep({ content, imageUrl, imageAlt, imageCaption, imageCredit, imageCreditUrl }: ImageStepProps) {
  return (
    <div className="animate-fadeIn">
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
            Example
          </span>
        </div>
        <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
          {content}
        </p>
        {imageUrl && <StepImage url={imageUrl} alt={imageAlt || 'Example illustration'} caption={imageCaption} credit={imageCredit} creditUrl={imageCreditUrl} />}
      </div>
    </div>
  )
}

function SummaryStep({ content, lessonTitle }: { content: string; lessonTitle: string }) {
  // Split content by newlines or periods for bullet points
  const points = content
    .split(/[.\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  return (
    <div className="animate-fadeIn">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Lesson Summary
            </span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {lessonTitle}
            </h3>
          </div>
        </div>

        {points.length > 1 ? (
          <ul className="space-y-3">
            {points.map((point, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {index + 1}
                </span>
                <span className="text-gray-800 dark:text-gray-200">{point}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
            {content}
          </p>
        )}
      </div>
    </div>
  )
}
