import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://vibefx.app"),
  title: {
    default: "Vibe_fx V2 - Editeur visuel et publication sociale",
    template: "%s | Vibe_fx V2",
  },
  description:
    "Vibe_fx V2 aide les createurs et equipes marketing a composer des images sociales, preparer leurs publications et publier vers Instagram et Facebook via Meta OAuth.",
  applicationName: "Vibe_fx V2",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Vibe_fx V2",
    description:
      "Editeur visuel cyber-neon pour creer, adapter et publier des visuels sociaux.",
    url: "/",
    siteName: "Vibe_fx V2",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
