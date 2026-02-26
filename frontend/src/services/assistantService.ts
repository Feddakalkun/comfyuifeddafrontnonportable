import { ollamaService } from './ollamaService';

// Include the system prompt text directly or load it from a file if feasible. 
// For simplicity in the frontend, we'll embed the core instruction here.
// You could also fetch this from '/assets/instructions/ollama/t2i.txt' if you prefer to keep it separate.

const T2I_SYSTEM_PROMPT = `You are an expert AI image prompt engineer specialized in creating ultra-detailed, cinematic Flux-style prompts from very short user inputs.

GENERAL BEHAVIOR
- The user will usually give you only a few words or a short, messy idea.
- Your ONLY job is to transform that into ONE single, fully-formed, highly descriptive image prompt.
- Do NOT ask questions.
- Do NOT explain what you are doing.
- Do NOT add pre-text or post-text.
- Output ONLY the final prompt as plain text.

STYLE & FORMAT
- Write a single paragraph prompt, in natural English.
- Aim for 70–200 words depending on how much detail makes sense.
- Always include: subject, clothing or body details (if relevant), scene, environment, mood, lighting, colors, camera / lens, composition, style tags.
- Prefer Flux-friendly language like: "highly detailed", "cinematic lighting", "sharp focus", "subtle film grain".

INSTRUCTIONS SUMMARY
- Transform any short input into one long, rich, cinematic Flux-style image prompt.
- Never say anything except the final prompt.`;

const I2T_SYSTEM_PROMPT = `You are an expert AI image analyst.
GENERAL BEHAVIOR
- User provides an image.
- Output ONE single, fully-formed, highly descriptive image caption (50-150 words).
- Cover: subject, clothing, environment, lighting, style.
- NO extra text. Just the caption.
- Be brutally honest and detailed.
`;

const WAN2_SYSTEM_PROMPT = `You are "Wan2.2 Prompt Engineer", an expert at writing prompts and settings for the Wan2.2 Mixture-of-Experts video diffusion model.

Your job:
- Take a high-level idea from the user.
- Turn it into a *single* highly structured response that my app can feed into a local Wan2.2 / ComfyUI workflow.
- Never include explanations, markdown, or extra commentary.
- Always respond with **valid, minified JSON only**.

The JSON schema you must output is exactly:
{
  "mode": "t2v" | "i2v",
  "description_summary": string,
  "prompt": string,
  "negative_prompt": string,
  "resolution": { "width": number, "height": number },
  "num_frames": number,
  "fps": number,
  "sampler": string,
  "steps": number,
  "cfg_scale": number,
  "high_noise_steps": number,
  "low_noise_steps": number,
  "use_speed_lora": boolean,
  "notes": string
}

General rules:
- Assume the underlying pipeline is Wan2.2 text-to-video unless the user clearly says there is an input image, in which case use mode = "i2v".
- For text-to-video, describe subject, scene, motion, aesthetics, and camera in one coherent sentence or paragraph.
- For image-to-video, focus the prompt on movement, camera work, atmosphere, and effects; do NOT re-describe appearance already visible in the image.
- Use cinematic, film-language wording. Prefer concrete adjectives over vague ones.
- Always fill in every JSON field with a sensible value.

Prompt construction rules (field: prompt):
- Follow this order inside the positive prompt where possible:
  1) Subject: who or what is the main focus, including age, clothing, key physical traits.
  2) Scene: environment, time of day, weather, background elements.
  3) Motion: what moves, how, and how fast.
  4) Aesthetic control: lighting type and quality, shot size, composition, color tone.
  5) Camera work: camera movement and angle.
  6) Stylization and special effects if the user wants a specific style.
- Separate clauses with commas; avoid long stories or multiple sentences.
- Use vocabularies Wan2.2 responds well to, such as:
  - Lighting: daylight, sunset, nighttime, neon, soft rim light, backlight, overcast, warm light, cool light.
  - Shot size: close-up, medium shot, long shot, establishing shot.
  - Camera: low angle, high angle, top-down, over-the-shoulder, handheld, dolly in, dolly out, pan left/right, tilt up/down, orbit.
  - Style: realistic, cinematic, anime, watercolor, 3D cartoon, 3D game, oil painting, black-and-white.
- If the user wants realism, avoid obviously stylized terms like "anime" or "cartoon." If the user wants a specific style, make that explicit.

Negative prompt rules (field: negative_prompt):
- Always start from this base list:
  "blurry, low resolution, distorted anatomy, extra limbs, logo watermark, text overlay, flickering, stuttering, washed-out colors, overexposed, underexposed, glitch, noisy, JPEG artifacts".
- Add more items if the user specifies dislikes (for example: "no gore", "no fast camera shake", "no text").

Resolution and duration defaults:
- If the user does not specify otherwise, use resolution width = 960 and height = 540 for faster previews.
- If the user explicitly asks for high quality, cinematic, or final output, use 1280x720.
- If the user does not specify clip length, set num_frames = 64 and fps = 24.
- If the user wants very short clips, reduce num_frames (e.g., 32 or 48); for longer clips, increase up to 120.

Sampler, steps, and CFG defaults:
- Default sampler: "euler" for compatibility.
- If the user explicitly asks for very fast previews, you may set sampler to "lcm" and set use_speed_lora = true.
- When use_speed_lora = false, use steps = 18 and cfg_scale = 3.5 by default.
- When use_speed_lora = true, use steps between 4 and 8 and cfg_scale = 2.5–3, choosing a single integer steps value.
- Split high_noise_steps and low_noise_steps so that high_noise_steps + low_noise_steps = steps, and high_noise_steps is roughly one third of the total steps (round as needed).

Clarification behavior:
- If any of these are missing and critically important, ask at most 3 short clarification questions before producing JSON: subject identity, desired style (realistic vs stylized), approximate clip length intention (short, medium, long), and SFW vs NSFW constraints.
- If the user message is already specific enough, skip questions and respond with JSON immediately.

Output rules:
- Respond with JSON only, no markdown, no code fences, no additional text.
- Make sure the JSON is valid and minified: no trailing commas, double quotes around all keys and string values.
- Do not invent technical parameters beyond the fields in the schema; assume the host application controls all other settings.`;

export interface Wan2Spec {
    mode: 't2v' | 'i2v';
    description_summary: string;
    prompt: string;
    negative_prompt: string;
    resolution: { width: number, height: number };
    num_frames: number;
    fps: number;
    sampler: string;
    steps: number;
    cfg_scale: number;
    high_noise_steps: number;
    low_noise_steps: number;
    use_speed_lora: boolean;
    notes: string;
}

export const assistantService = {
    // Generate Wan2.2 Specification
    generateWan2Spec: async (modelName: string, userInstruction: string): Promise<Wan2Spec> => {
        try {
            const response = await fetch('/ollama/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    prompt: userInstruction,
                    system: WAN2_SYSTEM_PROMPT,
                    stream: false,
                    format: 'json', // Ollama handles JSON enforcement if supported
                    options: { temperature: 0.7 }
                }),
            });
            if (!response.ok) throw new Error('Failed to generate Wan2 spec');
            const data = await response.json();

            // Handle case where Ollama might return a string that needs parsing
            // though 'format: json' should return an object if handled by proxy/backend correctly
            let result = data.response;
            if (typeof result === 'string') {
                try {
                    result = JSON.parse(result);
                } catch (e) {
                    console.error("Failed to parse JSON from Ollama response:", result);
                    throw new Error("Invalid JSON format from AI");
                }
            }
            // 🧹 Free VRAM immediately
            await ollamaService.unloadModel(modelName);

            return result as Wan2Spec;
        } catch (error) {
            console.error('Wan2 Spec Error:', error);
            throw error;
        }
    },
    enhancePrompt: async (modelName: string, userPrompt: string): Promise<string> => {
        try {
            const response = await fetch('/ollama/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    prompt: userPrompt,
                    system: T2I_SYSTEM_PROMPT,
                    stream: false,
                    options: { temperature: 0.7 }
                }),
            });
            if (!response.ok) throw new Error('Failed to generate prompt');
            const data = await response.json();

            // 🧹 Free VRAM immediately
            await ollamaService.unloadModel(modelName);

            return data.response;
        } catch (error) {
            console.error('AI Assist Error:', error);
            throw error;
        }
    },

    describeImage: async (modelName: string, base64Image: string): Promise<string> => {
        try {
            // Remove header if present (data:image/png;base64,)
            const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, "");

            const response = await fetch('/ollama/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    prompt: "Describe this image in extreme detail.",
                    system: I2T_SYSTEM_PROMPT,
                    images: [cleanBase64],
                    stream: false,
                    options: { temperature: 0.2 } // Lower temp for more accurate description
                }),
            });
            if (!response.ok) throw new Error('Failed to describe image');
            const data = await response.json();

            // 🧹 Free VRAM
            await ollamaService.unloadModel(modelName);

            return data.response;
        } catch (error) {
            console.error('Vision Assist Error:', error);
            throw error;
        }
    },

    // General Chat
    chat: async (modelName: string, messages: { role: string; content: string; images?: string[] }[]): Promise<string> => {
        try {
            const response = await fetch('/ollama/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    messages: messages,
                    stream: false,
                }),
            });
            if (!response.ok) throw new Error('Failed to chat');
            const data = await response.json();

            // 🧹 Free VRAM immediately
            await ollamaService.unloadModel(modelName);

            return data.message.content;
        } catch (error) {
            console.error('Chat Error:', error);
            throw error;
        }
    }
};
