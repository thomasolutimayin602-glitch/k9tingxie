import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '看拼音写汉字 · 1-9年级生字词智能听写默写系统',
  description: '覆盖全量义务教育1-9年级3500常用字词，支持田字格触控默写、严格笔顺与字形检验、错字错词自动归档及3遍订正、错题重测与字帖打印导出。',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '看拼音写汉字',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased selection:bg-amber-100 selection:text-amber-900">
        {children}
      </body>
    </html>
  );
}
