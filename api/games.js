export default async function handler(req, res) {

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY

  try {

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/game_downloads?select=title,zip_url,cue_url,status,platform,display_order,is_visible&is_visible=eq.true&order=display_order.asc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        }
      }
    )

    if (!response.ok) {
      throw new Error("Supabase request failed")
    }

    const data = await response.json()

    res.status(200).json(data)

  } catch (err) {

    res.status(500).json({
      error: "Failed to load games"
    })

  }

}
