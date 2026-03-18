module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Método não permitido"
    });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      success: false,
      message: "Supabase não configurado"
    });
  }

  try {
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const username = String(req.query?.username || "").trim();

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username obrigatório"
      });
    }

    const { data, error } = await supabase
      .from("game_requests")
      .select("id")
      .eq("requester_name", username)
      .eq("user_seen_reply", false)
      .not("admin_reply", "is", null);

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message || "Erro ao contar respostas"
      });
    }

    return res.status(200).json({
      success: true,
      unread_count: Array.isArray(data) ? data.length : 0
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Erro interno"
    });
  }
};