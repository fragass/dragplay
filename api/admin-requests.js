module.exports = async function handler(req, res) {
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
      .select("username, its_admin")
      .eq("username", username)
      .maybeSingle();

    if (adminError) {
      return res.status(500).json({
        success: false,
        message: adminError.message || "Erro ao validar admin"
      });
    }

    if (!adminUser?.its_admin) {
      return res.status(403).json({
        success: false,
        message: "Acesso negado"
      });
    }

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("game_requests")
        .select("id, requester_name, game_title, core, notes, status, admin_reply, reviewed_by, reviewed_at, created_at")
        .eq("status", "pending")
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

    if (req.method === "POST") {
      const body = req.body || {};
      const requestId = Number(body.request_id);
      const status = String(body.status || "").trim().toLowerCase();
      const adminReply = String(body.admin_reply || "").trim();

      if (!Number.isInteger(requestId) || requestId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Ticket inválido"
        });
      }

      if (!["approved", "rejected", "pending_info"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status inválido"
        });
      }

      if (!adminReply) {
        return res.status(400).json({
          success: false,
          message: "Informe a resposta do admin"
        });
      }

      const { error } = await supabase
        .from("game_requests")
        .update({
          status,
          admin_reply: adminReply,
          reviewed_by: username,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) {
        return res.status(500).json({
          success: false,
          message: error.message || "Erro ao responder ticket"
        });
      }

      return res.status(200).json({
        success: true,
        message: "Ticket respondido com sucesso"
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
