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
    const ticketType = String(body.ticket_type || "request").trim().toLowerCase();

    const gameTitle = String(body.game_title || "").trim();
    const core = String(body.core || "").trim().toLowerCase();

    const reportSubject = String(body.report_subject || "").trim();
    const reportCategory = String(body.report_category || "").trim().toLowerCase();

    const notes = String(body.notes || "").trim() || null;

    if (!requesterName) {
      return res.status(400).json({
        success: false,
        message: "Usuário não identificado."
      });
    }

    if (!["request", "report"].includes(ticketType)) {
      return res.status(400).json({
        success: false,
        message: "Tipo de ticket inválido."
      });
    }

    if (ticketType === "request") {
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
    }

    if (ticketType === "report") {
      if (!reportSubject) {
        return res.status(400).json({
          success: false,
          message: "Informe o assunto do reporte."
        });
      }

      if (reportSubject.length > 120) {
        return res.status(400).json({
          success: false,
          message: "O assunto está muito longo."
        });
      }

      if (!["download_off", "erro_site", "outro"].includes(reportCategory)) {
        return res.status(400).json({
          success: false,
          message: "Selecione um tipo de problema válido."
        });
      }
    }

    if (notes && notes.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "A observação está muito longa."
      });
    }

    const payload = {
      requester_name: requesterName,
      ticket_type: ticketType,
      notes,
      status: "pending",
      user_seen_reply: true
    };

    if (ticketType === "request") {
      payload.game_title = gameTitle;
      payload.core = core;
      payload.report_subject = null;
      payload.report_category = null;
    }

    if (ticketType === "report") {
      payload.game_title = null;
      payload.core = null;
      payload.report_subject = reportSubject;
      payload.report_category = reportCategory;
    }

    const { error } = await supabase
      .from("game_requests")
      .insert([payload]);

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message || "Erro ao salvar ticket."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ticket enviado com sucesso."
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Erro interno."
    });
  }
};
