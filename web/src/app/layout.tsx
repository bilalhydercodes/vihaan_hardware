import type { Metadata } from 'next';
import './globals.css';
import { TrackerProvider } from '@/context/TrackerContext';
import { Navbar } from '@/components/layout/Navbar';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { TokenModal } from '@/components/layout/TokenModal';

import { WelcomeBanner } from '@/components/layout/WelcomeBanner';
import { JarvisAssistant } from '@/components/jarvis/JarvisAssistant';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'NAVIC-TRACK | Satellite Antenna Tracker',
  description: 'Simple and autonomous satellite antenna tracker for NavIC and other satellites',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
        <TrackerProvider>
          <OfflineBanner />
          <WelcomeBanner />
          <Navbar />
          <TokenModal />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <JarvisAssistant />
          <footer className="border-t border-slate-900 bg-slate-950/80 mt-16 py-6 text-center text-sm text-slate-400">
            <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>NAVIC-TRACK &bull; Satellite Antenna Tracker</div>
              <div className="flex items-center gap-4 text-xs">
                <Link href="/about" className="text-cyan-400 hover:text-cyan-300 underline">
                  About & Hardware Specs
                </Link>
                <Link href="/settings" className="text-slate-400 hover:text-slate-200">
                  Settings
                </Link>
              </div>
            </div>
          </footer>
        </TrackerProvider>
      </body>
    </html>
  );
}
