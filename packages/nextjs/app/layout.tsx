import { Barlow } from "next/font/google";
import localFont from "next/font/local";
import "@rainbow-me/rainbowkit/styles.css";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import { ModalLayout } from "~~/components/modals/ModalLayout";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";
import { DisclaimerChecker } from "~~/components/Common/DisclaimerChecker";

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
