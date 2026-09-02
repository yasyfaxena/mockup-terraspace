import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Ganti dengan id unik kamu, format terbalik-domain. Boleh bebas asal unik,
  // ini yang jadi identitas app di Play Store/App Store nanti.
  appId: "com.terraspace.workspaces",
  appName: "TerraSpace",
  webDir: "dist", // tidak dipakai secara aktif karena kita load dari 'server.url' di bawah, tapi wajib diisi.
  server: {
    // GANTI url ini setelah website kamu sudah di-deploy/publish.
    // Contoh kalau pakai Lovable: "https://nama-project-kamu.lovable.app"
    // Contoh kalau pakai domain sendiri: "https://terraspace.com"
    //
    // SEMENTARA testing di HP/emulator lewat WiFi yang sama dengan laptop
    // (sebelum deploy), bisa pakai IP lokal laptop kamu, contoh:
    // "http://192.168.1.5:8080" (cek IP laptop lewat `ipconfig` di Windows
    // atau `ifconfig`/`ip a` di Mac/Linux, port sesuai `npm run dev`).
    url: "https://booking.terraspace.com",
    cleartext: true, // izinkan http:// (bukan https) khusus untuk testing lokal di atas.
  },
};

export default config;
