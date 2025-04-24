import OpenAI from "openai";
import { MealAnalysis } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

// Generate a realistic food image based on description
export async function generateFoodImage(description: string, foodName?: string): Promise<string> {
  try {
    const prompt = `A photorealistic, appetizing image of ${foodName || "food"}: ${description}. This should look like a smartphone photo of real food, not a 3D render or illustration. The image should have natural lighting and be shot from above (top-down view) as if someone is about to eat it. No text, no watermarks, high quality, high resolution.`;
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
      response_format: "b64_json"
    });

    if (response.data[0].b64_json) {
      return response.data[0].b64_json;
    } else {
      throw new Error("Failed to generate image: No base64 data returned");
    }
  } catch (error: any) {
    console.error("Error generating food image:", error);
    throw new Error(`Failed to generate food image: ${error?.message || 'Unknown error'}`);
  }
}

export async function analyzeFood(imageBase64: string, description?: string): Promise<MealAnalysis> {
  try {
    let content: string;
    
    // Different prompts based on whether we have an image or just text
    if (imageBase64) {
      // We have an image
      const imagePrompt = `Analyze this food image and estimate its nutritional information.
${description ? `The user describes it as: ${description}` : ""}

Identify the food item and provide detailed nutritional information including:
1. Calories
2. Fat (in grams)
3. Carbohydrates (in grams)
4. Protein (in grams)
5. Brand name (if it's not a generic food like an apple; otherwise leave it blank)
6. Estimated quantity and appropriate unit (where units are: grams, ounces, or count)

For the quantity, use:
- "count" for items that come in discrete units (e.g., "2 count" for 2 cookies)
- "grams" for items typically measured by weight in metric
- "ounces" for items typically measured by weight in imperial

Respond with a JSON object in this format: 
{
  "calories": number,
  "fat": number,
  "carbs": number,
  "protein": number,
  "foodName": string,
  "brandName": string (or empty if generic),
  "quantity": number,
  "unit": string (one of: "grams", "ounces", or "count")
}

The foodName should be specific (e.g., "Grilled Chicken Salad" instead of just "Salad").`;

      const imageResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: imagePrompt },
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
        max_tokens: 800,
      });
      
      content = imageResponse.choices[0].message.content || '{"calories":0, "fat":0, "carbs":0, "protein":0}';
    } else {
      // We only have a text description
      const textPrompt = `Based on this food description, estimate the nutritional information:
${description || "Unknown food"}

Provide detailed nutritional information including:
1. Calories
2. Fat (in grams)
3. Carbohydrates (in grams)
4. Protein (in grams)
5. Brand name (if it's not a generic food like an apple; otherwise leave it blank)
6. Estimated quantity and appropriate unit (where units are: grams, ounces, or count)

For the quantity, use:
- "count" for items that come in discrete units (e.g., "2 count" for 2 cookies)
- "grams" for items typically measured by weight in metric
- "ounces" for items typically measured by weight in imperial

Respond with a JSON object in this format: 
{
  "calories": number,
  "fat": number,
  "carbs": number,
  "protein": number,
  "foodName": string,
  "brandName": string (or empty if generic),
  "quantity": number,
  "unit": string (one of: "grams", "ounces", or "count")
}

The foodName should be specific (e.g., "Grilled Chicken Salad" instead of just "Salad").`;

      const textResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: textPrompt
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      });

      content = textResponse.choices[0].message.content || '{"calories":0, "fat":0, "carbs":0, "protein":0}';
    }
    
    const result = JSON.parse(content) as MealAnalysis;

    // Ensure all values are valid numbers and round them to integers
    return {
      calories: Math.round(Number(result.calories) || 0),
      fat: Math.round(Number(result.fat) || 0),
      carbs: Math.round(Number(result.carbs) || 0),
      protein: Math.round(Number(result.protein) || 0),
      foodName: result.foodName || undefined,
      brandName: result.brandName || undefined,
      quantity: result.quantity ? Math.round(Number(result.quantity)) : undefined,
      unit: result.unit || undefined
    };
  } catch (error: any) {
    console.error("Error analyzing food:", error);
    throw new Error(`Failed to analyze food: ${error?.message || 'Unknown error'}`);
  }
}