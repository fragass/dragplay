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
    const username = String(body.username || "").trim();
    const requestId = Number(body.request_id);
    const userFollowup = String(body.user_followup || "").trim();

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username obrigatório"
      });
    }

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Ticket inválido"
      });
    }

    if (!userFollowup) {
      return res.status(400).json({
        success: false,
        message: "Digite a informação complementar"
      });
    }

    const { data: ticket, error: fetchError } = await supabase
      .from("game_requests")
      .select("id, requester_name, status")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchError) {
      return res.status(500).json({
        success: false,
        message: fetchError.message || "Erro ao buscar ticket"
      });
    }

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket não encontrado"
      });
    }

    if (ticket.requester_name !== username) {
      return res.status(403).json({
        success: false,
        message: "Você não pode responder este ticket"
      });
    }

    if (ticket.status !== "pending_info") {
      return res.status(400).json({
        success: false,
        message: "Este ticket não está aguardando complemento"
      });
    }

    const { error: updateError } = await supabase
      .from("game_requests")
      .update({
        user_followup: userFollowup,
        status: "pending",
        admin_reply: null,
        reviewed_by: null,
        reviewed_at: null
      })
      .eq("id", requestId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: updateError.message || "Erro ao reenviar ticket"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Complemento enviado com sucesso"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Erro interno"
    });
  }
};