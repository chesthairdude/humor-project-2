import "./globals.css";

export const metadata = {
  title: "Humor Admin",
  description: "Superadmin-only moderation and analytics"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" style={{ height: "100%" }} suppressHydrationWarning>
      <body style={{ height: "100%", margin: 0 }}>{children}</body>
    </html>
  );
}
