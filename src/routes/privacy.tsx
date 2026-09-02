import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { SiteShell, PageHeader } from "@/frontend/site/site-shell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — TerraSpace" },
      {
        name: "description",
        content:
          "How TerraSpace collects, uses, stores and protects your personal data when you book a workspace or use our services.",
      },
      { property: "og:title", content: "TerraSpace Privacy Policy" },
      { property: "og:description", content: "What data we collect and how we use it." },
    ],
  }),
  component: PrivacyPage,
});

const sectionsEn: { title: string; body: string[] }[] = [
  {
    title: "1. Information We Collect",
    body: [
      "When you create an account, book a room, or contact support, we collect information such as your full name, email address, phone number, company name, and payment details necessary to process your booking.",
      "We also automatically collect certain technical information, such as device type, browser, IP address, and usage data, to help us operate and improve the platform.",
    ],
  },
  {
    title: "2. How We Use Your Information",
    body: [
      "We use your information to create and manage your account, process bookings and payments, issue digital access credentials (such as your QR pass), respond to support requests, and send booking-related notifications.",
      "We may also use aggregated, non-identifying data to understand how the platform is used and to improve our services.",
    ],
  },
  {
    title: "3. Sharing of Information",
    body: [
      "We do not sell your personal data. We may share limited information with trusted service providers who help us operate the platform, such as payment processors and access-control systems, solely for the purpose of delivering our services.",
      "We may disclose information where required by law or to protect the rights, property, or safety of TerraSpace, our users, or others.",
    ],
  },
  {
    title: "4. Data Retention",
    body: [
      "We retain your personal data for as long as your account is active or as needed to provide services, comply with legal obligations, resolve disputes, and enforce our agreements.",
    ],
  },
  {
    title: "5. Your Rights",
    body: [
      "You may request access to, correction of, or deletion of your personal data by contacting us through the Help Center. Some information may be retained where required for legal, security, or record-keeping purposes.",
    ],
  },
  {
    title: "6. Security",
    body: [
      "We use reasonable technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    title: "7. Cookies & Similar Technologies",
    body: [
      "We use cookies and similar technologies to keep you signed in, remember your preferences, and understand how the platform is used.",
    ],
  },
  {
    title: "8. Changes to this Policy",
    body: [
      "We may update this Privacy Policy from time to time. Continued use of TerraSpace after an update means you accept the revised policy.",
    ],
  },
  {
    title: "9. Contact",
    body: [
      "Questions about this Privacy Policy or how your data is handled can be raised through the Help Center.",
    ],
  },
];

const sectionsId: { title: string; body: string[] }[] = [
  {
    title: "1. Informasi yang Kami Kumpulkan",
    body: [
      "Saat Anda membuat akun, memesan ruangan, atau menghubungi dukungan, kami mengumpulkan informasi seperti nama lengkap, alamat email, nomor telepon, nama perusahaan, dan detail pembayaran yang diperlukan untuk memproses pemesanan Anda.",
      "Kami juga secara otomatis mengumpulkan informasi teknis tertentu, seperti jenis perangkat, browser, alamat IP, dan data penggunaan, untuk membantu kami mengoperasikan dan meningkatkan platform.",
    ],
  },
  {
    title: "2. Bagaimana Kami Menggunakan Informasi Anda",
    body: [
      "Kami menggunakan informasi Anda untuk membuat dan mengelola akun Anda, memproses pemesanan dan pembayaran, menerbitkan kredensial akses digital (seperti QR pass Anda), menanggapi permintaan dukungan, dan mengirimkan notifikasi terkait pemesanan.",
      "Kami juga dapat menggunakan data agregat yang tidak mengidentifikasi individu untuk memahami penggunaan platform dan meningkatkan layanan kami.",
    ],
  },
  {
    title: "3. Berbagi Informasi",
    body: [
      "Kami tidak menjual data pribadi Anda. Kami dapat membagikan informasi terbatas dengan penyedia layanan tepercaya yang membantu kami mengoperasikan platform, seperti prosesor pembayaran dan sistem kontrol akses, semata-mata untuk tujuan memberikan layanan kami.",
      "Kami dapat mengungkapkan informasi apabila diwajibkan oleh hukum atau untuk melindungi hak, properti, atau keselamatan TerraSpace, pengguna kami, atau pihak lain.",
    ],
  },
  {
    title: "4. Retensi Data",
    body: [
      "Kami menyimpan data pribadi Anda selama akun Anda aktif atau selama diperlukan untuk memberikan layanan, mematuhi kewajiban hukum, menyelesaikan sengketa, dan menegakkan perjanjian kami.",
    ],
  },
  {
    title: "5. Hak Anda",
    body: [
      "Anda dapat meminta akses, koreksi, atau penghapusan data pribadi Anda dengan menghubungi kami melalui Pusat Bantuan. Beberapa informasi mungkin tetap disimpan apabila diperlukan untuk tujuan hukum, keamanan, atau pencatatan.",
    ],
  },
  {
    title: "6. Keamanan",
    body: [
      "Kami menggunakan langkah-langkah teknis dan organisasi yang wajar untuk melindungi data pribadi Anda dari akses, perubahan, pengungkapan, atau perusakan yang tidak sah. Tidak ada metode transmisi atau penyimpanan yang sepenuhnya aman, dan kami tidak dapat menjamin keamanan mutlak.",
    ],
  },
  {
    title: "7. Cookie & Teknologi Serupa",
    body: [
      "Kami menggunakan cookie dan teknologi serupa untuk menjaga Anda tetap masuk, mengingat preferensi Anda, dan memahami cara platform digunakan.",
    ],
  },
  {
    title: "8. Perubahan Kebijakan",
    body: [
      "Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Penggunaan TerraSpace setelah pembaruan berarti Anda menyetujui kebijakan yang telah direvisi.",
    ],
  },
  {
    title: "9. Kontak",
    body: [
      "Pertanyaan mengenai Kebijakan Privasi ini atau cara data Anda diperlakukan dapat diajukan melalui Pusat Bantuan.",
    ],
  },
];

function PrivacyPage() {
  const { locale } = useI18n();
  const sections = locale === "id" ? sectionsId : sectionsEn;

  return (
    <SiteShell>
      <PageHeader
        eyebrow="Legal"
        title={locale === "id" ? "Kebijakan Privasi" : "Privacy Policy"}
        description={
          locale === "id"
            ? "Cara TerraSpace mengumpulkan, menggunakan, dan melindungi data pribadi Anda."
            : "How TerraSpace collects, uses, and protects your personal data."
        }
      />

      <section className="container-page py-10">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
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
