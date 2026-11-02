'use strict';
require('dotenv').config();

// Uses the official Gemini REST API. Model IDs are configurable because availability can vary by project and region.
class GoogleAIService {
  constructor() { this.apiKey = process.env.GEMINI_API_KEY || ''; }
  isConfigured() { return Boolean((process.env.GEMINI_API_KEY || '').trim() && !/your_actual_api_key_here|replace_me|placeholder/i.test(process.env.GEMINI_API_KEY)); }
  model() { return process.env.GEMINI_MODEL || 'gemini-3.8-flash'; }
  imageModel() { return process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image'; }
  async request(model, payload, timeout=60000) {
    if (!this.isConfigured()) { const e=new Error('Google AI key is missing. Add GEMINI_API_KEY to the project-root .env file and restart the server.'); e.statusCode=503; throw e; }
    const endpoint='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent';
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':this.apiKey},body:JSON.stringify(payload),signal:AbortSignal.timeout(timeout)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const detail=data?.error?.message||('Google AI API request failed ('+response.status+').');const e=new Error(detail);e.statusCode=response.status;throw e;}
    return data;
  }
  async generateChat(message, history=[]) {
    const contents=[];
    for(const item of history.slice(-12)) contents.push({role:item.role==='assistant'?'model':'user',parts:[{text:item.content.slice(0,5000)}]});
    contents.push({role:'user',parts:[{text:message}]});
    const data=await this.request(this.model(),{systemInstruction:{parts:[{text:'You are Seller AI, the helpful multilingual AI assistant inside Seller Drop Shipping AI. Help sellers with dropshipping, Indian ecommerce, product selection, margins, listings, returns, customer support, marketing, business planning, troubleshooting and general questions. Reply in the language used by the user, including Bengali, Hindi or English. Be practical, transparent and conversational. Ask follow-up questions when needed. Never claim you placed orders, connected marketplaces, booked couriers, published posts or changed account settings unless a real connected service confirms it. Do not ask users to share passwords, API keys or sensitive customer data. Explain uncertainty and remind sellers to verify live prices, marketplace policies, taxes and legal matters.'}]},contents,generationConfig:{temperature:0.65,maxOutputTokens:1400}},60000);
    const reply=(data?.candidates?.[0]?.content?.parts||[]).filter(p=>typeof p.text==='string').map(p=>p.text).join('').trim();
    if(!reply) throw new Error(data?.promptFeedback?.blockReason ? 'Google AI could not answer this prompt because it was blocked by safety settings.' : 'Google AI returned no text answer.');
    return reply;
  }
  async generateProductCopy(productTitle, category, dealPrice) {
    const prompt='You are an ethical dropshipping copywriter for Indian marketplaces. Create marketing content for this product. Do not invent certifications, warranties, medical claims, discounts, stock availability or product specifications not supplied. Product: '+productTitle+'; Category: '+category+'; Price: ₹'+dealPrice+'. Return JSON with keys catchyHeadline (string), videoScript (30-second simple Hinglish voiceover), bulletPoints (array of 4 strings), imagePrompt (detailed photorealistic ecommerce product image prompt).';
    const data=await this.request(this.model(),{contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.5,maxOutputTokens:1200}},60000);
    const text=(data?.candidates?.[0]?.content?.parts||[]).filter(p=>typeof p.text==='string').map(p=>p.text).join('').trim();
    if(!text)throw new Error('Google AI returned no marketing copy.');
    try { const clean=text.replace(/^\s*```(?:json)?/i,'').replace(/```\s*$/,'').trim(); const parsed=JSON.parse(clean); if(!parsed.catchyHeadline||!parsed.videoScript||!Array.isArray(parsed.bulletPoints)||!parsed.imagePrompt)throw new Error('Missing fields'); return parsed; }
    catch(_) { throw new Error('Google AI returned marketing content in an unexpected format. Please retry.'); }
  }
  async generateHighGraphicsImage(prompt, size='1024x1024') {
    const aspectRatio=size==='1024x1536'?'3:4':size==='1536x1024'?'4:3':'1:1';
    const data=await this.request(this.imageModel(),{contents:[{role:'user',parts:[{text:'Create a polished, photorealistic commercial e-commerce product image based on this brief. High-detail studio lighting, clean professional composition, premium realistic materials, product clearly visible. Avoid extra text, logos or watermarks unless explicitly requested. Prompt: '+prompt}]}],generationConfig:{responseModalities:['TEXT','IMAGE'],imageConfig:{aspectRatio}}},120000);
    const parts=data?.candidates?.[0]?.content?.parts||[];
    const imagePart=parts.find(p=>p.inlineData?.data||p.inline_data?.data);
    const encoded=imagePart?.inlineData?.data||imagePart?.inline_data?.data;
    if(!encoded) { const detail=parts.filter(p=>p.text).map(p=>p.text).join(' ').trim(); throw new Error(detail||'Google AI returned no image. Check that your project has access to the selected image model.'); }
    const mimeType=imagePart.inlineData?.mimeType||imagePart.inline_data?.mime_type||'image/png';
    if(!mimeType.startsWith('image/'))throw new Error('Google AI returned an unsupported image format.');
    return {imageData:'data:'+mimeType+';base64,'+encoded,mimeType,model:this.imageModel()};
  }
}
module.exports=new GoogleAIService();
