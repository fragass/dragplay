module.exports = async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      success: false,
      message: "Supabase não configurado"
    });h
  }

  try {
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const username =
      req.method === "GET"
        ? String(req.query?.username || "").trim()
        : String(req.body?.username || "").trim();

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username obrigatório"
      });
    }

    const { data: adminUser, error: adminError } = await supabase
      .from("pusers")
      .select("username, is_admin")
      .eq("username", username)
      .maybeSingle();

    if (adminError) {
      return res.status(500).json({
        success: false,
        message: adminError.message || "Erro ao validar admin"
      });
    }

    if (!adminUser?.is_admin) {
      return res.status(403).json({
        success: false,
        message: "Acesso negado"
      });
    }

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("game_requests")
        .select("id, requester_name, game_title, core, notes, status, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        return res.status(500).json({
          success: false,
          message: error.message || "Erro ao carregar tickets"
        });
      }

      return res.status(200).json({
        success: true,
        requests: Array.isArray(data) ? data : []
      });
    }

    return res.status(405).json({
      success: false,
      message: "Método não permitido"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Erro interno"
    });
  }
};
