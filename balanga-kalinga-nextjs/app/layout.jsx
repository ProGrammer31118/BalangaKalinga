import "./globals.css";
import Navbar from "../components/Navbar";
import { currentUser } from "../lib/auth";

export const metadata = {
  title: "Balanga Kalinga - Kalinga tayo, care together",
  description: "A gentle space for student wellness",
};

export default async function RootLayout({ children }) {
  const user = await currentUser().catch(() => null);
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Navbar user={user} />
        <main className="container">{children}</main>
        <footer className="footer">
          <div>Balanga Kalinga - A student wellness companion. AI is supportive, not a replacement for a licensed professional.</div>
          <div style={{ marginTop: 6 }}>Crisis: NCMH 1553 | Hopeline 0917-558-4673 | Emergency 911</div>
        </footer>
      </body>
    </html>
  );
}
