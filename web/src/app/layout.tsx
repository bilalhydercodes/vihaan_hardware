import type { Metadata } from 'next';
import './globals.css';
import { TrackerProvider } from '@/context/TrackerContext';
import { Navbar } from '@/components/layout/Navbar';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { TokenModal } from '@/components/layout/TokenModal';

export const metadata: Metadata = {
  title: 'NAVIC-TRACK | Autonomous 2-Axis Satellite Antenna Tracker',
  description: 'ESP32-based autonomous satellite antenna tracker for NavIC/IRNSS and LEO orbits',
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
          <Navbar />
          <TokenModal />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <footer className="border-t border-slate-900 bg-slate-950/50 mt-12 py-6 text-center text-xs text-slate-500 font-mono">
            NAVIC-TRACK &copy; 2026 &bull; ESP32 Dual-Axis Satellite Mount &bull; Designed for Indian Regional Navigation Satellite System (NavIC)
          </footer>
        </TrackerProvider>
      </body>
    </html>
  );
}
