import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Viprou - Cotización rápida de vidrios",
  description: "Sistema de optimización y cotización de vidrios con inteligencia artificial",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        {/* Google Ads (gtag.js) */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=AW-17150749356" strategy="afterInteractive" />
        <Script id="google-ads-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17150749356');
            
            // Evento de carga de página
            gtag('event', 'page_view', {
              page_title: 'Viprou - Cotización rápida de vidrios',
              page_location: window.location.href,
              send_to: 'AW-17150749356'
            });
            
            // Función global para eventos personalizados
            window.trackEvent = function(eventName, parameters = {}) {
              gtag('event', eventName, {
                ...parameters,
                send_to: 'AW-17150749356'
              });
              console.log('Google Ads Event:', eventName, parameters);
            };
          `}
        </Script>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
