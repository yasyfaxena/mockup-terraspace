import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { SiteShell, PageHeader } from "@/frontend/site/site-shell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — TerraSpace" },
      {
        name: "description",
        content:
          "Renter responsibilities, damage and loss policy, and the terms that apply to every TerraSpace booking.",
      },
      { property: "og:title", content: "TerraSpace Terms & Conditions" },
      { property: "og:description", content: "What renters agree to before paying for a booking." },
    ],
  }),
  component: TermsPage,
});

const sectionsEn: { title: string; body: string[] }[] = [
  {
    title: "1. Acceptance of these Terms",
    body: [
      "By making a booking on TerraSpace — including bookings at TerraSpace Johor Bahru — you agree to these Terms & Conditions. You must review and accept them before completing payment for any booking.",
    ],
  },
  {
    title: "2. Bookings & Use of the Space",
    body: [
      "A booking reserves the exact room, date and time window shown at checkout for the stated purpose only (e.g. an event, meeting or workday). Access is granted for the confirmed window plus any grace period shown on your confirmation.",
      "You are responsible for the conduct of everyone who enters the venue under your booking, including guests, vendors, contractors and staff you bring with you.",
    ],
  },
  {
    title: "3. Renter Responsibilities",
    body: [
      "As the renter, you agree to:",
      "• Use the room and all furniture, fixtures, equipment and amenities with reasonable care, and only for their intended purpose.",
      "• Follow venue house rules, posted safety notices, and any reasonable instructions from on-site staff.",
      "• Not exceed the stated capacity of the room, and not sublet or resell your booking to a third party.",
      "• Leave the space in the condition you found it — remove your own rubbish, decorations and equipment at the end of your booking, unless a cleaning service is included.",
      "• Not bring in anything illegal, hazardous, or that violates fire safety or building regulations (e.g. open flames, unapproved pyrotechnics, unsafe wiring).",
      "• Report any pre-existing damage you notice at check-in, and any damage, breakage or loss that occurs during your booking, as soon as it happens.",
      "• Ensure your guests are supervised and comply with these same responsibilities.",
    ],
  },
  {
    title: "4. Damaged, Broken or Lost Items",
    body: [
      "You are financially responsible for any damage to, breakage of, or loss of venue property (including furniture, fixtures, AV equipment, screens, whiteboards and fittings) that occurs during your booking window, caused by you, your guests, or anyone you bring on site.",
      "Process: (1) Report the incident to on-site staff or through the booking's contact channel immediately, or as soon as reasonably possible. (2) TerraSpace / the venue operator will assess the item and estimate the cost of repair or, if repair isn't possible, like-for-like replacement, using the vendor's or manufacturer's current rate. (3) You will receive an itemised invoice showing the assessed cost. (4) Charges are billed to the payment method used for your booking, or invoiced separately if that charge fails; payment is due within the period stated on the invoice.",
      "Minor, ordinary wear and tear from normal use is not chargeable. Charges apply only to damage, breakage or loss beyond normal wear and tear, or caused by misuse or negligence.",
      "If you dispute a charge, contact support within 7 days of the invoice date with any supporting evidence (photos, timestamps, witness accounts); charges under dispute will be reviewed before being finalised.",
      "Note: specific charge amounts, any security deposit, and administrative fee percentages are set by the venue/PointStar team and may be shown at checkout or in the venue's house rules; this policy describes the process that applies regardless of the amount.",
    ],
  },
  {
    title: "5. Cancellations & Rescheduling",
    body: [
      "Cancellation windows and any fees vary by room and are shown on the workspace page and in your booking confirmation. Cancelling after the stated window may forfeit some or all of the amount paid.",
    ],
  },
  {
    title: "6. Access & Security",
    body: [
      "Digital access (QR pass and/or smart door unlock) is issued for your confirmed booking window only. Do not share your access credentials with anyone outside your booking. You are responsible for activity that occurs under your access credentials during your booking window.",
    ],
  },
  {
    title: "7. Payment",
    body: [
      "Full payment is required to confirm a booking, using one of the payment methods offered at checkout. Prices shown include applicable taxes unless stated otherwise.",
    ],
  },
  {
    title: "8. Liability",
    body: [
      "To the extent permitted by law, TerraSpace and the venue operator are not liable for indirect or consequential loss arising from your use of the space. Nothing in these Terms excludes liability that cannot be excluded by law.",
    ],
  },
  {
    title: "9. Changes to these Terms",
    body: [
      "These Terms may be updated from time to time. The version in effect at the time of your booking applies to that booking. Continued use of TerraSpace after an update means you accept the revised Terms.",
    ],
  },
  {
    title: "10. Contact",
    body: [
      "Questions about these Terms, or about a damage/loss charge, can be raised through the Help Center or your dashboard's booking details.",
    ],
  },
];

const sectionsId: { title: string; body: string[] }[] = [
  {
    title: "1. Penerimaan Syarat & Ketentuan",
    body: [
      "Dengan melakukan pemesanan di TerraSpace — termasuk pemesanan di TerraSpace Johor Bahru — Anda menyetujui Syarat & Ketentuan ini. Anda wajib membaca dan menyetujuinya sebelum menyelesaikan pembayaran untuk pemesanan apa pun.",
    ],
  },
  {
    title: "2. Pemesanan & Penggunaan Ruang",
    body: [
      "Pemesanan mencakup ruangan, tanggal dan jam yang tertera saat checkout, untuk tujuan yang dinyatakan saja (misalnya acara, rapat, atau hari kerja). Akses diberikan untuk jangka waktu yang dikonfirmasi, ditambah masa tenggang yang tertera pada konfirmasi Anda.",
      "Anda bertanggung jawab atas perilaku semua orang yang masuk ke venue di bawah pemesanan Anda, termasuk tamu, vendor, kontraktor, dan staf yang Anda bawa.",
    ],
  },
  {
    title: "3. Tanggung Jawab Penyewa",
    body: [
      "Sebagai penyewa, Anda setuju untuk:",
      "• Menggunakan ruangan beserta seluruh furnitur, perlengkapan, peralatan dan fasilitas dengan wajar dan hanya sesuai fungsinya.",
      "• Mematuhi peraturan venue, papan peringatan keselamatan, dan instruksi wajar dari staf di lokasi.",
      "• Tidak melebihi kapasitas ruangan yang ditentukan, dan tidak menyewakan kembali atau menjual pemesanan Anda kepada pihak ketiga.",
      "• Meninggalkan ruangan dalam kondisi seperti saat Anda menerimanya — membawa keluar sampah, dekorasi, dan peralatan milik Anda sendiri setelah pemesanan selesai, kecuali layanan kebersihan sudah termasuk.",
      "• Tidak membawa barang ilegal, berbahaya, atau yang melanggar aturan keselamatan kebakaran/gedung (misalnya api terbuka, kembang api yang tidak disetujui, instalasi listrik yang tidak aman).",
      "• Melaporkan kerusakan yang sudah ada saat check-in, serta kerusakan, kerusakan barang, atau kehilangan yang terjadi selama masa sewa, sesegera mungkin.",
      "• Memastikan tamu Anda diawasi dan mematuhi tanggung jawab yang sama.",
    ],
  },
  {
    title: "4. Barang Rusak, Patah, atau Hilang",
    body: [
      "Anda bertanggung jawab secara finansial atas kerusakan, kerusakan (patah), atau kehilangan properti venue (termasuk furnitur, perlengkapan, peralatan AV, layar, whiteboard, dan fitting) yang terjadi selama masa pemesanan Anda, yang disebabkan oleh Anda, tamu Anda, atau siapa pun yang Anda bawa.",
      "Proses: (1) Laporkan kejadian kepada staf di lokasi atau melalui kanal kontak pemesanan sesegera mungkin. (2) TerraSpace / operator venue akan menilai barang tersebut dan memperkirakan biaya perbaikan, atau jika tidak dapat diperbaiki, penggantian dengan barang sejenis, menggunakan tarif vendor/produsen yang berlaku. (3) Anda akan menerima invoice terperinci yang menunjukkan biaya yang dinilai. (4) Biaya akan ditagihkan ke metode pembayaran yang digunakan saat pemesanan, atau ditagihkan terpisah jika penagihan tersebut gagal; pembayaran jatuh tempo sesuai periode yang tertera pada invoice.",
      "Keausan wajar akibat penggunaan normal tidak dikenakan biaya. Biaya hanya berlaku untuk kerusakan, kerusakan barang, atau kehilangan di luar keausan wajar, atau yang disebabkan oleh kelalaian/penyalahgunaan.",
      "Jika Anda keberatan atas suatu tagihan, hubungi tim dukungan dalam 7 hari sejak tanggal invoice disertai bukti pendukung (foto, waktu kejadian, keterangan saksi); tagihan yang disengketakan akan ditinjau sebelum difinalisasi.",
      "Catatan: nominal biaya spesifik, deposit keamanan (jika ada), dan persentase biaya administrasi ditentukan oleh tim venue/PointStar dan dapat ditampilkan saat checkout atau pada peraturan venue; kebijakan ini menjelaskan proses yang berlaku terlepas dari nominalnya.",
    ],
  },
  {
    title: "5. Pembatalan & Penjadwalan Ulang",
    body: [
      "Jangka waktu pembatalan dan biaya yang berlaku berbeda-beda per ruangan dan tertera pada halaman ruang kerja serta konfirmasi pemesanan Anda. Pembatalan setelah jangka waktu tersebut dapat menghanguskan sebagian atau seluruh jumlah yang telah dibayarkan.",
    ],
  },
  {
    title: "6. Akses & Keamanan",
    body: [
      "Akses digital (QR pass dan/atau buka pintu pintar) diterbitkan hanya untuk jangka waktu pemesanan yang telah dikonfirmasi. Jangan membagikan kredensial akses Anda kepada siapa pun di luar pemesanan Anda. Anda bertanggung jawab atas aktivitas yang terjadi melalui kredensial akses Anda selama masa pemesanan.",
    ],
  },
  {
    title: "7. Pembayaran",
    body: [
      "Pembayaran penuh diperlukan untuk mengonfirmasi pemesanan, menggunakan salah satu metode pembayaran yang tersedia saat checkout. Harga yang ditampilkan sudah termasuk pajak yang berlaku kecuali dinyatakan lain.",
    ],
  },
  {
    title: "8. Tanggung Jawab (Liabilitas)",
    body: [
      "Sepanjang diizinkan oleh hukum, TerraSpace dan operator venue tidak bertanggung jawab atas kerugian tidak langsung atau konsekuensial yang timbul dari penggunaan ruang oleh Anda. Tidak ada bagian dari Syarat ini yang mengecualikan tanggung jawab yang tidak dapat dikecualikan berdasarkan hukum.",
    ],
  },
  {
    title: "9. Perubahan Syarat & Ketentuan",
    body: [
      "Syarat & Ketentuan ini dapat diperbarui dari waktu ke waktu. Versi yang berlaku pada saat pemesanan Anda adalah versi yang mengikat untuk pemesanan tersebut. Penggunaan TerraSpace setelah pembaruan berarti Anda menyetujui Syarat yang telah direvisi.",
    ],
  },
  {
    title: "10. Kontak",
    body: [
      "Pertanyaan mengenai Syarat & Ketentuan ini, atau mengenai tagihan kerusakan/kehilangan, dapat diajukan melalui Pusat Bantuan atau detail pemesanan pada dashboard Anda.",
    ],
  },
];

function TermsPage() {
  const { locale } = useI18n();
  const sections = locale === "id" ? sectionsId : sectionsEn;

  return (
    <SiteShell>
      <PageHeader
        eyebrow={locale === "id" ? "Legal" : "Legal"}
        title={locale === "id" ? "Syarat & Ketentuan" : "Terms & Conditions"}
        description={
          locale === "id"
            ? "Berlaku untuk setiap pemesanan TerraSpace, termasuk TerraSpace Johor Bahru. Harap baca sebelum membayar."
            : "Applies to every TerraSpace booking, including TerraSpace Johor Bahru. Please read before you pay."
        }
      />

      <section className="container-page py-10">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {locale === "id"
                ? "Draf: konten ini adalah draf awal Syarat & Ketentuan untuk mendukung alur pemesanan. Mohon direview oleh tim legal/PointStar sebelum dipublikasikan secara resmi, khususnya nominal biaya, deposit dan periode pembayaran pada bagian ganti rugi."
                : "Draft: this is an initial draft of the Terms & Conditions to support the booking flow. Please have the PointStar/legal team review it before publishing, especially the specific charge amounts, deposit and payment period in the damage/loss section."}
            </p>
          </div>

          <div className="mt-8 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            {locale === "id" ? "Terakhir diperbarui: Agustus 2026" : "Last updated: August 2026"}
          </div>

          <div className="mt-6 grid gap-8">
            {sections.map((s) => (
              <div key={s.title}>
                <h2 className="text-base font-bold text-foreground">{s.title}</h2>
                <div className="mt-2.5 grid gap-2">
                  {s.body.map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
