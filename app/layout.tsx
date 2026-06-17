import './globals.css';

export const metadata = {
  title: 'Git View',
  description: 'A focused workbench for browsing local Git activity.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
