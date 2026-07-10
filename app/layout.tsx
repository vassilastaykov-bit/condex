import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Condex — PDF Zip Upload",
  description: "Upload a zipped folder of PDFs to Condex.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
