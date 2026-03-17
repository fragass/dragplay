const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

function sendJson(res, status, payload) {
  return res.status(status).json(payload);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, {
      success: false,
      message: "Método não permitido",
    });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return sendJson(res, 500, {
      success: false,
      message: "Supabase não configurado",
    });
  }

  try {
    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");

    if (!username || !password) {
      return sendJson(res, 400, {
        success: false,
        message: "Dados incompletos",
      });
    }

    const { data, error } = await supabaseAnon
      .from("pusers")
      .select("username, password, is_admin")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      return sendJson(res, 500, {
        success: false,
        message: error.message,
      });
    }

    if (!data || data.password !== password) {
      return sendJson(res, 401, {
        success: false,
        message: "Usuário ou senha inválidos",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    return sendJson(res, 200, {
      success: true,
      token,
      user: data.username,
      isAdmin: !!data.is_admin,
    });
  } catch (err) {
    return sendJson(res, 500, {
      success: false,
      message: err?.message || "Erro interno",
    });
  }
};
