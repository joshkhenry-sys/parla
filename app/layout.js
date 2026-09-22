import "./globals.css";

export const metadata = {
  title: "Parla",
  description: "Learn languages by actually using them.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
