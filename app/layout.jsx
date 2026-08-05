export const metadata = {
  title: 'TORQUE·OS',
  description: 'Servicio técnico de bicicletas y máquinas de ejercicios'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: '#0d1216', color: '#e9eef2', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
