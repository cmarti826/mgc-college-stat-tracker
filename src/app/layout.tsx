import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'MGC College Golf Stat Tracker',
  description: 'Player & Coach stats tracking for college golf',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Navbar />
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </body>
    </html>
  );
}
