import "./globals.css";

export const metadata = {
  title: "Jadual Rawatan | Pusat Kesihatan Drehab AF",
  description: "Webapp Jadual Rawatan Pusat Kesihatan Drehab AF",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ms">
      <body>{children}</body>
    </html>
  );
}
