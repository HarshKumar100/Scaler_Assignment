import { Inter } from 'next/font/google';
import './globals.css';
import NavigationProgress from './NavigationProgress';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Formly — Build beautiful forms',
  description: 'Create and share interactive forms effortlessly.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NavigationProgress />
        {children}
      </body>
    </html>
  );
}
