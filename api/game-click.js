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
    const gameId = Number(body.game_id);

    if (!Number.isInteger(gameId) || gameId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID do jogo inválido"
      });
    }

    const { data: game, error: fetchError } = await supabase
      .from("game_downloads")
      .select("id, download_count")
      .eq("id", gameId)
      .maybeSingle();

    if (fetchError) {
      return res.status(500).json({
        success: false,
        message: fetchError.message || "Erro ao buscar jogo"
      });
    }

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Jogo não encontrado"
      });
    }

    const nextCount = Number(game.download_count || 0) + 1;

    const { error: updateError } = await supabase
      .from("game_downloads")
      .update({ download_count: nextCount })
      .eq("id", gameId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: updateError.message || "Erro ao atualizar contagem"
      });
    }

    return res.status(200).json({
      success: true,
      download_count: nextCount
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Erro interno"
    });
  }
};