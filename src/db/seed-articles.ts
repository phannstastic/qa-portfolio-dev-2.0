import { createDbConnection, closeDbConnection } from './index';
import { articles } from './schema';

export const SAMPLE_ARTICLES = [
  {
    title: 'Halo, Saya Irfan: Di Antara Pengujian Perangkat Lunak, Secangkir Kopi, dan Detail-Detail Kecil',
    slug: 'halo-saya-irfan-pengujian-kopi-dan-detail-kecil',
    category: 'Life & Journal',
    tags: 'About Me, Life & Journal, Personal Story, QA Mindset, Slow Living',
    readTime: '3 min read',
    coverImageUrl: '/images/articles/qa-workspace-desk.jpg',
    excerpt:
      'Cerita tentang siapa saya di balik layar pengujian software—lulusan Informatika yang mencintai detail, penikmat artisan gelato dan sudut tenang kota, serta alasan mengapa ruang catatan ini dibuat.',
    content: `Selamat datang di ruang personal saya. Nama saya **Muhammad Irfan Trinugroho**, atau biasa dipanggil **Irfan**. 

Jika kamu datang dari halaman portfolio utama, kamu mungkin mengenal saya sebagai seorang lulusan Teknik Informatika (*Informatics*) yang mendedikasikan fokus pada dunia **Software Quality Assurance (QA)**—mulai dari manual functional testing, menyusun skenario dan test case terstruktur, hingga UAT/FAT validation dan automasi pengujian dasar.

Namun di ruang tulisan ini, saya ingin melepas topi formal itu sejenak. Ruang ini adalah sudut tenang tempat saya mencatat hal-hal yang saya cintai di luar layar terminal: makanan enak, sudut kota yang teduh, secangkir kopi, dan renungan sehari-hari.

---

## 1. Menemukan Keindahan dalam Ketelitian

Sejak masa kuliah hingga terjun ke industri pengujian perangkat lunak—bekerja bersama tim di Noctura Kreasi Sistema, PT Vortex Buana Edumedia, hingga PT Len Industri (Persero)—saya menyadari satu hal yang mendasar: **saya sangat menyukai detail**.

Bagi seorang QA, detail adalah segalanya. Menemukan satu kejanggalan kecil atau *edge case* yang terlewat bukan sekadar tugas teknis, melainkan bentuk empati kepada pengguna akhir agar mereka merasakan pengalaman digital yang mulus, stabil, dan menyenangkan.

![Meja Kerja & Catatan Pengujian](/images/articles/qa-workspace-desk.jpg)
*Sudut ruang kerja harian: catatan skenario pengujian, secangkir minuman hangat, dan suasana yang tenang untuk berpikir jernih.*

Menariknya, rasa ingin tahu terhadap detail ini tidak berhenti ketika laptop ditutup. Cara pandang tersebut secara alami mewarnai bagaimana saya menikmati hidup sehari-hari.

---

## 2. Di Luar Layar: Makanan Enak, Artisan Gelato, dan Sudut Kota

Di waktu luang, saya selalu menikmati hal-hal yang bergerak dengan ritme lebih tenang (*slow living*):

- **Menjelajahi Kuliner & Artisan Gelato:** Saya selalu antusias mencicipi kuliner autentik dan berburu gelato berkualitas—terutama varian matcha pekat yang seimbang atau pistachio yang gurih dan *nutty*.
- **Jalan Pagi & Mengamati Sudut Kota:** Berjalan kaki santai di pagi hari, menikmati aroma tanah basah sehabis hujan, dan mengamati arsitektur bangunan tua atau kafe kecil yang nyaman.
- **Rasa Ingin Tahu Teknologi & Eksplorasi Baru:** Mengulik perkembangan teknologi modern, bereksperimen dengan desain antarmuka minimalis, serta mencoba berbagai tool baru yang membuat alur kerja semakin efisien.

Berikut catatan ringkas seputar rutinitas dan ruang gerak saya:

- **Lokasi & Home Base:** Indonesia (Jawa Barat)
- **Fokus Karier:** Software QA, Manual Testing & UAT Support
- **Ritual Akhir Pekan:** Jalan pagi, hunting artisan matcha gelato & kopi
- **Rating Personal Hidup:** ★ 10 / 10 untuk ritme hidup yang seimbang

---

## 3. Mengapa Ruang Catatan Ini Ada?

Dunia teknologi sering kali bergerak sangat cepat. Fitur baru, rilis baru, deadline yang padat. Di tengah hiruk-pikuk itu, memiliki sebuah wadah untuk berhenti sejenak, mengumpulkan pikiran, dan menuliskan cerita adalah cara terbaik bagi saya untuk merawat keseimbangan (*mindfulness*).

Blog ini bukan jurnal akademis yang kaku, melainkan catatan jujur dari perjalanan saya:
1. **Food & Bites:** Ulasan jujur seputar kafe, gelato, dan tempat makan yang berkesan.
2. **Travel & Places:** Cerita sudut jalanan kota, tempat menepi, dan pengalaman jalan-jalan santai.
3. **Life & Journal:** Renungan personal seputar proses belajar, karier, dan kebiasaan hidup bermakna.
4. **Tech & Notes:** Catatan teknis ringan seputar testing, quality assurance, dan dunia rekayasa perangkat lunak.

---

## Mari Terhubung

Terima kasih sudah menyempatkan waktu membaca cerita kecil ini. Entah kamu sesama pegiat teknologi, penguji perangkat lunak, sesama penikmat kuliner, atau sekadar pejalan yang kebetulan mampir, senang bisa berbagi cerita denganmu.

Jika ingin bertukar ide atau sekadar menyapa, jangan ragu untuk menghubungi saya melalui tombol **Get in touch** di atas atau lewat LinkedIn dan Instagram!
`,
    isPublished: true,
  },
];

export async function seedArticles() {
  const db = createDbConnection();
  console.log('🌱 Resetting articles table and seeding single personal article...');

  // Delete all existing articles as requested by user
  await db.delete(articles);
  console.log('🧹 Cleared all existing articles.');

  for (const item of SAMPLE_ARTICLES) {
    await db.insert(articles).values({
      title: item.title,
      slug: item.slug,
      category: item.category,
      tags: item.tags,
      readTime: item.readTime,
      coverImageUrl: item.coverImageUrl,
      excerpt: item.excerpt,
      content: item.content,
      isPublished: item.isPublished,
      publishedAt: new Date(),
    });
    console.log(`✅ Seeded article: "${item.title}"`);
  }

  console.log('🎉 Article seeding complete! Exactly 1 article exists.');
}

if (import.meta.main) {
  seedArticles()
    .then(async () => {
      await closeDbConnection();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Seeding articles failed:', err);
      await closeDbConnection();
      process.exit(1);
    });
}
