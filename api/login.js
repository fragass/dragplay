const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function sendJson(res, status, payload) {
  return res.status(status).json(payload);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });

    req.on("error", reject);
  });
}

async function handleLogin(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, {
      success: false,
      message: "Método não permitido",
    });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return sendJson(res, 500, {
      success: false,
      message: "Supabase não configurado",
    });
  }

  try {
    const body = await readJsonBody(req);
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "");

    if (!username || !password) {
      return sendJson(res, 400, {
        success: false,
        message: "Dados incompletos",
      });
    }

    const { data, error } = await supabaseAnon
      .from("users")
      .select("username, password, is_admin")
      .eq("username", username)
      .single();

    if (error || !data) {
      return sendJson(res, 401, {
        success: false,
        message: "Usuário ou senha inválidos",
      });
    }

    if (data.password !== password) {
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
  } catch {
    return sendJson(res, 500, {
      success: false,
      message: "Erro interno",
    });
  }
}

module.exports = handleLogin;
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
