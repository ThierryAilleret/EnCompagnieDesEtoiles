const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const { path } = JSON.parse(event.body || '{}');
  if (!path) return { statusCode: 400, body: "Missing path" };

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // attention : clé sécurisée
  );

  const today = new Date().toISOString().slice(0, 10); // format YYYY-MM-DD

  // Tente une mise à jour
  const { error: updateError } = await supabase
    .from('pageviews')
    .update({ count: supabase.rpc('increment', { x: 1 }) }) // ou count + 1
    .eq('date', today)
    .eq('path', path);

  if (updateError) {
    // Si la ligne n'existe pas, on l'insère
    const { error: insertError } = await supabase
      .from('pageviews')
      .insert([{ date: today, path, count: 1 }]);

    if (insertError) {
      return { statusCode: 500, body: JSON.stringify(insertError) };
    }
  }

  return { statusCode: 200, body: "OK" };
};
