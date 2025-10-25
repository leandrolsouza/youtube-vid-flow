import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VidFlow - Video Downloader",
  description: "Modern video downloader powered by yt-dlp",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
