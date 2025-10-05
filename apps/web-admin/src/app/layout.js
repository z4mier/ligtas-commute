import "./globals.css";

export const metadata = {
  title: "LigtasCommute Admin",
  description: "Admin dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#E9F1FA] text-[#0B1526] min-h-screen">
        {children}
      </body>
    </html>
  );
}
