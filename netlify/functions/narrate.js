import Groq from 'groq-sdk'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    }
  }

  const { dish_name, meal_type, persona, scores, weights, final_score, missing_ingredients = [] } = body

  if (!dish_name || !scores || !weights || !persona || !meal_type) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields' }),
    }
  }

  const prompt = `You are a friendly meal recommendation assistant. A meal suggestion system has selected "${dish_name}" for ${meal_type} for a ${persona}.

Here are the computed scores for why this meal was selected (all scores are between 0 and 1):
- Ingredient match: ${(scores.ingredient_match * 100).toFixed(0)}% (how well it matches what the user has at home)
- Effort fit: ${(scores.effort * 100).toFixed(0)}% (how well the cooking effort matches their lifestyle)
- Variety score: ${(scores.variety * 100).toFixed(0)}% (how fresh this pick feels given recent meals)
- Nutrition score: ${(scores.nutrition * 100).toFixed(0)}% (how balanced the nutritional profile is)
- Overall score: ${(final_score * 100).toFixed(0)}%
${missing_ingredients.length > 0 ? `- Missing ingredients: ${missing_ingredients.join(', ')}` : '- No missing ingredients'}

Write 2-3 friendly, conversational sentences explaining why this meal was recommended.
IMPORTANT RULES:
- Use ONLY the scores provided above.
- Do NOT invent nutrition facts, calorie counts, or ingredient details.
- Do NOT mention specific vitamins, minerals, or health claims.
- Keep it warm and human, not clinical.
- Do not start with "This meal" or "I recommend".`

  // try Groq first
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    })

    const narration = completion.choices[0]?.message?.content?.trim()

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ narration, model_used: 'groq' }),
    }
  } catch (groqError) {
    console.error('Groq failed:', groqError.message)

    // fall back to Gemini
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 150, temperature: 0.7 },
          }),
        }
      )

      const data = await response.json()
      const narration = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ narration, model_used: 'gemini' }),
      }
    } catch (geminiError) {
      console.error('Gemini also failed:', geminiError.message)

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narration: `${dish_name} scored well across ingredient availability, effort level, variety, and nutritional balance based on your current preferences and profile.`,
          model_used: 'template',
        }),
      }
    }
  }
}