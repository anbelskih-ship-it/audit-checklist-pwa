import * as functions from '@google-cloud/functions-framework'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

functions.http('auth', async (req, res) => {
  res.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(204).send(''); return }

  const { action, code, refresh_token, redirect_uri } = req.body

  try {
    if (action === 'exchange') {
      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
          redirect_uri, grant_type: 'authorization_code',
        }),
      })
      res.json(await resp.json())
    } else if (action === 'refresh') {
      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
          grant_type: 'refresh_token',
        }),
      })
      res.json(await resp.json())
    } else {
      res.status(400).json({ error: 'Unknown action' })
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})
