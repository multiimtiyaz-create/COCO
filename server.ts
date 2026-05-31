import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// API endpoint for SPM Intervention advice
app.post("/api/gemini/intervention", async (req, res) => {
  try {
    const { studentName, clazz, subjects } = req.body;
    
    // Fallback if key missing
    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({ 
        text: `### ⚠️ KONFIGURASI DIPERLUKAN\n\nUntuk mendapatkan analisis intervensi dikuasakan AI penuh, sila pastikan **GEMINI_API_KEY** dikonfigurasikan dalam panel **Settings > Secrets**.\n\nSistem headcount bagaimanapun tetap boleh menjana cadangan asas secara luar talian (offline).` 
      });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `
Anda adalah seorang Pakar Runding Akademik Cemerlang Sekolah Menengah di Malaysia yang sangat berpengalaman dalam "Sistem Headcount SPM" (TOV, PPT, dan ETR).

Sila teliti profil pelajar ini dan berikan pelan tindakan/intervensi akademik yang sangat sistematik dan praktikal (dalam Bahasa Malaysia).

=== PROFIL PELAJAR ===
Nama Pelajar: ${studentName || "N/A"}
Kelas: ${clazz || "N/A"}

=== PRESTASI SUBJEK ===
${(subjects || []).map((sub: any) => `- Subjek: ${sub.name} (Kod: ${sub.code || "N/A"})
  * TOV (Awal): ${sub.tovScore}% (${sub.tovGrade || "G"})
  * PPT (Pertengahan Tahun/Terkini): ${sub.pptScore}% (${sub.pptGrade || "G"})
  * ETR (Sasaran SPM): ${sub.etrScore}% (${sub.etrGrade || "G"})`).join('\n')}

=== SYARAT PENTING SIJIL SPM (LULUS WAJIB) ===
* Layak Mendapat Sijil SPM sekiranya LULUS subjek Bahasa Melayu (minimum Gred E, >=40%) dan Sejarah (minimum Gred E, >=40%).

=== FORMAT JAWAPAN (Sila gunakan Markdown bergaya yang kemas) ===
1. **Analisa Keseluruhan & Penilaian Kelayakan Sijil**: Berikan ringkasan pencapaian semasa (PPT) berbanding permulaan (TOV) dan sasaran (ETR). Adakah pelajar ini pada landasan untuk layak mendapat Sijil SPM (menyentuh secara khusus mengenai subjek Bahasa Melayu dan Sejarah)?
2. **Subjek Kritikal yang Perlu Fokus**: Kenal pasti subjek di mana jurang markah paling besar atau bertaraf gagal (G).
3. **Tindakan Intervensi Konkrit**: Cadangkan teknik belajar super spesifik bagi subjek kritikal tersebut (contohnya: untuk Sejarah dinasihatkan faham Konstruk KBAT dan Fokus Kertas 2 Bahagian B, Bahasa Melayu kuasai teknik Karangan Format / Novel, Matematik latih tubi soalan klon SPM bahagian rumus).
4. **Kata Kata Motivasi & Slogan Pembakar Semangat**: Slogan ringkas dan penuh motivasi untuk menaikkan moral pelajar ini.

Sila berikan jawapan dengan nada yang membina, menginspirasikan, menyentuh isu khusus pelajar, profesional dan tersusun menggunakan bullet points markdown.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error?.message || "Ralat tidak dijangka ketika menjana pelan intervensi." });
  }
});

// Serve frontend with Vite in dev, static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
