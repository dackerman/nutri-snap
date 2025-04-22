import OpenAI from "openai";
import { MealAnalysis } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export async function analyzeFood(imageBase64: string, description?: string): Promise<MealAnalysis> {
  try {
    const prompt = `Analyze this food image and estimate its nutritional information.
${description ? `The user describes it as: ${description}` : ""}
Identify the food item and provide your best estimate of the calories, fat (in grams), and carbohydrates (in grams).
Respond with a JSON object in this format: { "calories": number, "fat": number, "carbs": number, "foodName": string }
The foodName should be specific (e.g., "Grilled Chicken Salad" instead of just "Salad").`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = response.choices[0].message.content || '{"calories":0, "fat":0, "carbs":0}';
    const result = JSON.parse(content) as MealAnalysis;

    // Ensure all values are valid numbers and round them to integers
    return {
      calories: Math.round(Number(result.calories) || 0),
      fat: Math.round(Number(result.fat) || 0),
      carbs: Math.round(Number(result.carbs) || 0),
      foodName: result.foodName || undefined
    };
  } catch (error: any) {
    console.error("Error analyzing food image:", error);
    throw new Error(`Failed to analyze food image: ${error?.message || 'Unknown error'}`);
  }
}
