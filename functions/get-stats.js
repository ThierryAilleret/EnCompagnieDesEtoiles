const { createClient } = require('@supabase/supabase-js');

exports.handler = async () => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('pageviews')
      .select('*')
      .order('date', { ascending: false })
      .order('path', { ascending: true });

    if (error) {
      console.log("❌ Erreur SELECT :", error);
      return { statusCode: 500, body: JSON.stringify(error) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (err) {
    console.log("❌ Exception :", err);
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
