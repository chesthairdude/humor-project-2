import "./globals.css";

export const metadata = {
  title: "Humor Admin",
  description: "Superadmin-only moderation and analytics"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
