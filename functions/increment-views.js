const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  console.log("➡️ Fonction appelée");
  console.log("Body reçu :", event.body);

  const { path } = JSON.parse(event.body || '{}');
  if (!path) {
    console.log("❌ Aucun path reçu");
    return { statusCode: 400, body: "Missing path" };
  }

  console.log("📄 Path :", path);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("🔑 SUPABASE_URL :", supabaseUrl ? "OK" : "❌ manquant");
  console.log("🔑 SERVICE_ROLE_KEY :", supabaseKey ? "OK" : "❌ manquant");

  const supabase = createClient(supabaseUrl, supabaseKey);

  const today = new Date().toISOString().slice(0, 10);
  console.log("📅 Date :", today);

  console.log("🚀 Appel RPC increment_pageview…");

  const { data, error } = await supabase.rpc('increment_pageview', {
    p_date: today,
    p_path: path
  });

  console.log("📦 RPC data :", data);
  console.log("❗ RPC error :", error);

  if (error) {
    console.log("❌ ERREUR FINALE :", error);
    return { statusCode: 500, body: JSON.stringify(error) };
  }

  console.log("✅ Incrémentation OK");
  return { statusCode: 200, body: "OK" };
};
