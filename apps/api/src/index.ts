import { createApp } from './app.js'

const app = createApp({
  supabaseUrl: process.env.SUPABASE_URL!,
  secretKey: process.env.SUPABASE_SECRET_KEY!,
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  ownerId: process.env.OWNER_USER_ID,
  environment: process.env.APP_ENV ?? 'development',
})
const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '127.0.0.1'
app.listen(port, host, () => {
  console.log('Dakoorp API listening at http://' + host + ':' + port)
})
