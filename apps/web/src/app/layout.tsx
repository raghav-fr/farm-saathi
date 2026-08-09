import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "FarmSaathi AI — Agricultural Intelligence Platform",
  description:
    "A multilingual, multimodal AI agricultural decision-support platform for Indian farmers. Crop planning, disease detection, soil intelligence, weather, market prices and government schemes.",
  keywords: "agriculture, AI, crop recommendation, disease detection, farmer, India, Odisha",
  openGraph: {
    title: "FarmSaathi AI",
    description: "AI-powered agricultural assistant for Indian farmers",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="font-inter antialiased" suppressHydrationWarning>
        <div id="google_translate_element" style={{ display: "none" }}></div>
        <Providers>{children}</Providers>
        
        <Script id="google-translate-init" strategy="afterInteractive">
          {`
            function googleTranslateElementInit() {
              new window.google.translate.TranslateElement(
                { pageLanguage: 'en', autoDisplay: false },
                'google_translate_element'
              );
            }
          `}
        </Script>
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
