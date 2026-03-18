module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
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

    const username = String(req.body?.username || "").trim();

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username obrigatório"
      });
    }

    const { error } = await supabase
      .from("game_requests")
      .update({ user_seen_reply: true })
      .eq("requester_name", username)
      .eq("user_seen_reply", false)
      .not("admin_reply", "is", null);

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message || "Erro ao marcar como visto"
      });
    }

    return res.status(200).json({
      success: true
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Erro interno"
    });
  }
};
