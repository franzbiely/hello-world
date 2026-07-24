import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Francis Albores | Software Engineer",
  description:
    "Creative Software Engineer in Davao City, Philippines — portfolio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
