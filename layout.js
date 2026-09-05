export const metadata = {
  title: "Yvaine Gothic Order Bot",
  description: "Yvaine's Gothic Telegram order system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#09080b" }}>{children}</body>
    </html>
  );
}
