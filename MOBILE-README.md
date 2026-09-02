# Bikin App Mobile (Android/iOS) dari Website Ini

Pakai Capacitor: app HP-nya cuma "wadah" yang nampilin website kamu, jadi
tampilannya **otomatis sama persis** kayak web, nggak perlu bikin ulang UI.

## Syarat di laptop kamu

- Node.js sudah ada (kalau bisa jalanin `npm run dev`, berarti sudah punya)
- Buat Android: install **Android Studio** (gratis, dari developer.android.com)
- Buat iOS: **harus pakai Mac** + install **Xcode** (nggak bisa dari Windows)

Kalau cuma mau Android dulu, skip bagian iOS di semua langkah di bawah.

## Langkah-langkah

1. Buka terminal di folder project ini, install dependency (termasuk Capacitor
   yang sudah ditambahkan di `package.json`):

   ```
   npm install
   ```

2. Buka file `capacitor.config.ts`, ganti baris `url:` dengan alamat website
   kamu yang sudah live (kalau belum deploy, boleh sementara pakai IP lokal
   laptop + port, lihat contoh di komentar dalam file itu).

3. Tambahin platform Android (dan/atau iOS):

   ```
   npx cap add android
   npx cap add ios
   ```

   Ini bakal bikin folder baru `android/` (dan `ios/`) di project — itu
   project native asli, jangan dihapus.

4. Setiap kali habis ganti `capacitor.config.ts` atau update kode web, sync
   dulu:

   ```
   npx cap sync
   ```

5. Buka project native-nya buat di-run/di-test:

   ```
   npx cap open android
   ```

   (Ini otomatis buka Android Studio. Dari situ tinggal klik tombol Run ▶️,
   pilih emulator atau HP yang disambungin USB dengan Developer Mode aktif.)

## Setelah website di-deploy nanti

Begitu website kamu sudah punya link publik (misal dari Lovable Publish,
atau domain sendiri), update `url:` di `capacitor.config.ts` ke link itu,
matiin `cleartext: true` (ganti jadi `false`, karena link publik biasanya
sudah `https://`), lalu jalanin `npx cap sync` lagi.

## Bikin file APK/installer buat dibagi ke orang lain

Ini dilakuin dari dalam Android Studio: menu **Build → Generate Signed
Bundle / APK**, ikutin wizard-nya (bikin keystore/password baru kalau belum
pernah). Hasilnya file `.apk` yang bisa di-share & di-install manual di HP
Android lain.
