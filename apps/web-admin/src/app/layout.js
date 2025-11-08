import "./../globals.css";

export const metadata = {
  title: "LigtasCommute Admin",
  description: "Admin Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#F7FAFC] text-[#020817] antialiased">
        {children}
      </body>
    </html>
  );
}
