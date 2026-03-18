module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Método não permitido"
    });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({
      success: false,
      message: "Supabase não configurado"
    });
  }

  try {
    const { createClient } = require("@supabase/supabase-js");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data, error } = await supabase
      .from("game_downloads")
      .select("id, title, zip_url, cue_url, status, platform, is_visible, display_order, download_count")
      .eq("is_visible", true)
      .order("display_order", { ascending: true })
      .order("title", { ascending: true });

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message || "Erro ao carregar jogos"
      });
    }

    return res.status(200).json(Array.isArray(data) ? data : []);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Erro interno"
    });
  }
};