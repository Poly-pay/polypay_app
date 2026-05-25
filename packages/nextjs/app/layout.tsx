import { Barlow } from "next/font/google";
import localFont from "next/font/local";
import "@rainbow-me/rainbowkit/styles.css";
import { DisclaimerChecker } from "~~/components/Common/DisclaimerChecker";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import { ModalLayout } from "~~/components/modals/ModalLayout";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
});

const repetitionScroll = localFont({
  src: "../public/fonts/RepetitionScroll.ttf",
  variable: "--font-repetition",
  display: "swap",
});

export const metadata = getMetadata({
  title: "Polypay App",
  description: "A secure and user-friendly wallet for your digital assets",
});

// When mobile blocking is off (default), force a desktop-width viewport so
// mobile browsers render the full desktop layout (zoomed out) instead of
// breaking. When blocking is on, fall back to device-width so the /mobile
// screen renders correctly. Temporary while mobile is unsupported.
export const viewport = {
  width: process.env.NEXT_PUBLIC_ENABLE_MOBILE_BLOCK === "true" ? "device-width" : 1440,
};

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning className={`${barlow.variable} ${repetitionScroll.variable} font-barlow`}>
      <body>
        <ThemeProvider enableSystem>
          <ScaffoldEthAppWithProviders>
            <ModalLayout>
              <DisclaimerChecker />
              {children}
            </ModalLayout>
          </ScaffoldEthAppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
