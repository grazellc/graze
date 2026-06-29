import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Graze — Your places, everywhere',
  description: 'All your Google Maps saved places, enriched and ranked. Works on any device.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=Syne:wght@500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
