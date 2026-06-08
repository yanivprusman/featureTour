import type { Metadata } from "next";
import "./globals.css";
import FeedbackChatClient from "./feedback-chat-client";

export const metadata: Metadata = {
  title: "featureTour",
  description: "Interactive feature tour — annotated app screenshots with hover-to-explain tooltips over UI components",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}
        <FeedbackChatClient />
</body>
    </html>
  );
}
