# NoteSnap

**Turn your handwritten notes into organized study courses with AI.**

NoteSnap is a web application that transforms photos of notebook pages into structured, interactive study materials using Claude AI. Upload a photo of your notes, and get back a beautifully organized course with explanations, key concepts, and summaries.

## Features

- **AI-Powered Analysis**: Claude AI reads and understands handwritten notes, diagrams, and formulas
- **Instant Course Generation**: Get organized study material in seconds
- **Mobile-Friendly**: Take photos directly from your phone
- **Dark Mode Support**: Easy on the eyes for late-night studying
- **Secure Authentication**: Powered by Supabase Auth
- **Private & Secure**: Your notes are encrypted and never shared

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **AI**: [Anthropic Claude API](https://www.anthropic.com/)
- **Deployment**: [Vercel](https://vercel.com/) (recommended)

## Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm
- A Supabase account (free tier works)
- An Anthropic API key

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/notesnap.git
cd notesnap
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)

2. Create the `courses` table by running this SQL in the Supabase SQL Editor:

```sql
-- Create courses table
CREATE TABLE courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  original_image_url TEXT,
  extracted_content TEXT,
  generated_course JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own courses
CREATE POLICY "Users can view own courses" ON courses
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy: Users can insert their own courses
CREATE POLICY "Users can insert own courses" ON courses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own courses
CREATE POLICY "Users can update own courses" ON courses
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy: Users can delete their own courses
CREATE POLICY "Users can delete own courses" ON courses
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_courses_user_id ON courses(user_id);
CREATE INDEX idx_courses_created_at ON courses(created_at DESC);
```

3. Create a storage bucket for notebook images:
   - Go to Storage in your Supabase dashboard
   - Create a new bucket called `notebook-images`
   - Set it to private (or public if you prefer)

4. Get your API keys from Project Settings > API

### 4. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in your values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-your-key
```

### 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
notesnap/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, signup, etc.)
│   ├── (main)/            # Protected pages (dashboard, course)
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── course/           # Course-related components
│   ├── ui/               # Reusable UI components
│   └── upload/           # Upload components
├── contexts/             # React contexts (Toast, etc.)
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
│   ├── ai/              # Claude AI integration
│   ├── api/             # API error handling
│   └── supabase/        # Supabase clients
├── public/              # Static assets
└── types/               # TypeScript type definitions
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `NEXT_PUBLIC_APP_URL` | No | Your production URL (for meta tags) |

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub

2. Import your repository in [Vercel](https://vercel.com/new)

3. Add your environment variables in the Vercel dashboard

4. Deploy!

### Other Platforms

NoteSnap is a standard Next.js application and can be deployed to any platform that supports Next.js:

- **Netlify**: Use the Next.js adapter
- **Railway**: Direct Next.js support
- **AWS Amplify**: Next.js SSR support
- **Self-hosted**: Use `next build && next start`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload a notebook image |
| `/api/generate-course` | POST | Generate a course from an image |
| `/api/courses` | GET | Get all courses for the user |
| `/api/courses/[id]` | GET | Get a specific course |
| `/api/courses/[id]` | DELETE | Delete a course |
| `/api/courses/[id]/progress` | GET | Get course progress |
| `/api/courses/[id]/mastery` | GET | Get course mastery data |
| `/api/homework/sessions` | GET, POST | List/create homework sessions |
| `/api/homework/sessions/[id]` | GET, PATCH | Get/update homework session |
| `/api/homework/sessions/[id]/chat` | POST | Send chat message |
| `/api/homework/sessions/[id]/hint` | POST | Request hint |

## Production Considerations

### Security
- All API keys are validated at startup
- Server-side keys are never exposed to the client
- Row Level Security ensures users only access their own data
- Error messages are sanitized to prevent information leakage

### Performance
- Images are optimized with Next.js Image component
- Static pages are pre-rendered where possible
- Dynamic routes are server-rendered on demand

### Future Improvements
- Rate limiting for API endpoints
- Image compression before upload
- Caching for generated courses
- Webhook support for async processing

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Email: support@notesnap.app

---

Built with Next.js and Claude AI
