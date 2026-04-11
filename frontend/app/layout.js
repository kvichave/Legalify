import "./globals.css";
import Sidebar from "@/components/sidebar";

export const metadata = {
  title: "Legalify",
  description: "Legal document management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Sidebar />
        <main className="ml-16">
          {children}
        </main>
      </body>
    </html>
  );
}
