import './globals.css';

export const metadata = {
  title: 'ManageItNow',
  description: 'AI-first project, team and delivery management for Indian businesses',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
