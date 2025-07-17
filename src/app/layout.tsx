import type { Metadata } from "next";
import { Prociono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/user-context";
import { PeerProvider } from "@/lib/peer-context";
import IncomingCall from "@/components/incoming-call";

const prociono = Prociono({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Connects",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${prociono.variable} ${prociono.className} antialiased`}
      >
        <UserProvider>
          <PeerProvider>
            {children}

            <IncomingCall />
          </PeerProvider>
        </UserProvider>
      </body>
    </html>
  );
}
