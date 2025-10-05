export const metadata = { title: "LigtasCommute Admin" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial" }}>
        {children}
      </body>
    </html>
  );
}
