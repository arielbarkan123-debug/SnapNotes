# Web Image Fetching Architecture

## Overview

Step-level images in generated courses are fetched from Unsplash via `fetchWebImagesParallel()` in `lib/ai/claude.ts`. This was introduced to replace sequential per-image fetches, cutting total fetch time from ~4–5 minutes down to ~20 seconds.

## How it works

1. After Claude generates course JSON, `normalizeGeneratedCourse()` walks every step. Steps with `type: 'diagram'` or that otherwise need an image emit a `WebImageQuery` entry (lesson index, step index, search query, alt text).
2. `fetchWebImagesParallel()` groups those queries into batches of 20 and runs `Promise.all()` per batch, calling `searchEducationalImages()` (Unsplash wrapper in `lib/images/search.ts`) for each.
3. Results are written directly back onto the `course` object (`step.imageUrl`, `step.imageSource = 'web'`, credit fields).

## Which paths use it

| Source type | Calls `fetchWebImagesParallel`? | Location |
|-------------|--------------------------------|----------|
| Single image (`generateCourseFromImage`) | Yes | `lib/ai/claude.ts` ~line 945 |
| Multi-image progressive (`generateCourseFromMultipleImagesProgressive`) | Yes | ~line 1109 |
| Document/PDF/PPTX (`generateInitialCourse`) | Yes | ~line 1693 |
| Text (`generateCourseFromText`) | **No** — commented out | ~line 1812 |

## Why text courses skip it

`generateCourseFromText` uses Claude tool_use (`emit_text_course` tool). The tool schema defines steps with `type`, `content`, `options`, etc., but **no image fields**. Claude never emits image-related steps for this path, so `normalizeGeneratedCourse` collects an empty `webImageQueries` array anyway. The call was commented out because it was a no-op and added latency.

The service-level fallback in `generate-course.service.ts` (lines 107–116) that would fetch a single cover image via `searchEducationalImages(generatedCourse.title)` is also commented out for the same reason — text courses currently have no images at all.

## Re-enabling images for text courses

Two independent levers:

**Option A — Step-level images** (same as other paths):  
Add image fields to `TEXT_COURSE_TOOL` schema in `lib/ai/tools/text-course-tool.ts`, then uncomment in `generateCourseFromText` (~line 1812):
```ts
const subject = course.title.split(':')[0].trim()
await fetchWebImagesParallel(webImageQueries, course, subject)
```

**Option B — Cover image only** (simpler):  
Uncomment the `searchEducationalImages` block in `generate-course.service.ts` (lines 107–116). This fetches one image for the course cover, not per-step.

Both options can be enabled independently.
