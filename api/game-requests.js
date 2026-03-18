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

    const body = req.body || {};
    const requesterName = String(body.requester_name || "").trim() || null;
    const gameTitle = String(body.game_title || "").trim();
    const core = String(body.core || "").trim().toLowerCase();
    const notes = String(body.notes || "").trim() || null;

    if (!requesterName) {
      return res.status(400).json({
        success: false,
        message: "Usuário não identificado."
      });
    }

    if (!gameTitle) {
      return res.status(400).json({
        success: false,
        message: "Informe o nome do jogo."
      });
    }

    if (gameTitle.length > 120) {
      return res.status(400).json({
        success: false,
        message: "O nome do jogo está muito longo."
      });
    }

    if (!["psx", "n64"].includes(core)) {
      return res.status(400).json({
        success: false,
        message: "Selecione um core válido."
      });
    }

    if (notes && notes.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "A observação está muito longa."
      });
    }

    const { error } = await supabase
      .from("game_requests")
      .insert([
        {
          requester_name: requesterName,
          game_title: gameTitle,
          core,
          notes,
          status: "pending"
        }
      ]);

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message || "Erro ao salvar solicitação."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Solicitação enviada com sucesso."
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Erro interno."
    });
  }
};
