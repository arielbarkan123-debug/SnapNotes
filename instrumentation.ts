export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env')
    try {
      validateEnv()
    } catch (err) {
      // Log missing env vars but don't crash the server — routes will fail
      // individually when they actually need the missing variable.
      // eslint-disable-next-line no-console
      console.error('[NoteSnap] Environment validation warning:', err)
    }
  }
}
