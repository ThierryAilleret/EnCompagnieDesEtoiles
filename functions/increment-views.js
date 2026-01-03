const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const { path } = JSON.parse(event.body || '{}');
  if (!path) {
    return { statusCode: 400, body: "Missing path" };
  }

  // 🚫 Ne pas incrémenter si le chemin contient /stats/
	if (path.includes("/stats/")) {
		return { statusCode: 200, body: "Skipped (stats path)" };
	}

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase.rpc('increment_pageview', {
    p_date: today,
    p_path: path
  });

  if (error) {
    return { statusCode: 500, body: JSON.stringify(error) };
  }

  return { statusCode: 200, body: "OK" };
};
