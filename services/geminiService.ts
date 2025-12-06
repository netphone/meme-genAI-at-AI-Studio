import { GoogleGenAI, Type } from "@google/genai";

// Ensure API Key is present
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Helper to strip the data:image/xyz;base64, prefix
 */
const cleanBase64 = (base64Data: string) => {
  return base64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
};

/**
 * Generate funny captions for a meme image using Gemini 3 Pro Preview
 */
export const generateMemeCaptions = async (base64Image: string): Promise<string[]> => {
  try {
    const cleanData = cleanBase64(base64Image);

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png', // Assuming PNG for simplicity in this demo context
              data: cleanData
            }
          },
          {
            text: "Analyze this image and generate 5 funny, viral-worthy, short meme captions (top text / bottom text style or single punchlines) that fit the context perfectly. Be creative, sarcastic, or witty."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            captions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of 5 funny meme captions."
            }
          },
          required: ["captions"]
        }
      }
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    return data.captions || [];
  } catch (error) {
    console.error("Error generating captions:", error);
    throw error;
  }
};

/**
 * Analyze the image and generate a single, structured meme with Top and Bottom text.
 */
export const generateAutoMeme = async (base64Image: string): Promise<{ topText: string; bottomText: string }> => {
  try {
    const cleanData = cleanBase64(base64Image);

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanData
            }
          },
          {
            text: "Create a hilarious meme from this image. Return a JSON object with 'topText' (setup) and 'bottomText' (punchline). If the meme only needs bottom text, leave topText empty. Make it witty and current."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topText: { type: Type.STRING },
            bottomText: { type: Type.STRING }
          },
          required: ["bottomText"]
        }
      }
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error generating auto meme:", error);
    throw error;
  }
};

/**
 * Edit an image using Gemini 2.5 Flash Image (Nano Banana)
 * based on a text prompt (e.g., "Deep fry this image", "Add a hat").
 */
export const editMemeImage = async (base64Image: string, prompt: string): Promise<string | null> => {
  try {
    const cleanData = cleanBase64(base64Image);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanData
            }
          },
          {
            text: `Edit this image: ${prompt}. Return only the edited image.`
          }
        ]
      }
      // Note: responseSchema and responseMimeType are NOT supported for nano banana models
    });

    // Extract the image from the response parts
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};