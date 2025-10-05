// apps/web-admin/src/app/layout.js
import "./globals.css";

export const metadata = { title: "LigtasCommute Admin" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
