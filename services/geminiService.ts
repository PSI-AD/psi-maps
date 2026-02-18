
import { GoogleGenAI } from "@google/genai";
import { Project } from "../types";

export const getProjectInsights = async (project: Project): Promise<string> => {
  // Always use process.env.API_KEY directly for initialization as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Act as a high-end UAE real estate investment consultant. 
    Analyze the following property project:
    Name: ${project.name}
    Type: ${project.type}
    Developer: ${project.developerName}
    Location: Saadiyat Island, Abu Dhabi
    
    Provide a concise 3-sentence investment summary highlighting the ROI potential, 
    lifestyle appeal, and market standing of this specific developer in Abu Dhabi's luxury segment. 
    Keep it professional and enticing for high-net-worth individuals.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Insight currently unavailable.";
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "The market for Saadiyat Island remains exceptionally strong with high cultural appeal and steady capital appreciation. This area is Abu Dhabi's premier destination for luxury living.";
  }
};
