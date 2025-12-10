import { Barlow } from "next/font/google";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import "@rainbow-me/rainbowkit/styles.css";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";
import localFont from "next/font/local";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
});

const repetitionScroll = localFont({
  src: "../public/fonts/RepetitionScroll.ttf", // Đường dẫn tới file font
  variable: "--font-repetition",
  display: "swap",
});


export const metadata = getMetadata({
  title: "Polypay Wallet",
  description: "A secure and user-friendly wallet for your digital assets",
});

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning className={`${barlow.variable} ${repetitionScroll.variable} font-barlow`}>
      <body>
        <ThemeProvider enableSystem>
          <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
