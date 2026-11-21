'use strict';

require('dotenv').config();

/**
 * OpenAI Chat Completions service for Seller Dropshipping AI.
 *
 * Environment variables:
 *   OPENAI_API_KEY  (required)
 *   OPENAI_MODEL    (optional; defaults to gpt-4.1-mini)
 *
 * This service deliberately uses Node.js 20's built-in fetch API, so no
 * additional npm dependency is required.
 */
class OpenAIService {
  constructor() {
    this.apiKey = (process.env.OPENAI_API_KEY || '').trim();
  }

  isConfigured() {
    const key = (process.env.OPENAI_API_KEY || '').trim();
    return Boolean(
      key &&
      !/your_actual_api_key_here|replace_me|placeholder|your_openai_api_key/i.test(key)
    );
  }

  model() {
    return (process.env.OPENAI_MODEL || 'gpt-4.1-mini').trim();
  }

  async request(messages, timeout = 90000) {
    if (!this.isConfigured()) {
      const error = new Error(
        'OpenAI is not configured. Add OPENAI_API_KEY to the Render Environment Variables.'
      );
      error.statusCode = 503;
      throw error;
    }

    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model(),
          messages,
          temperature: 0.5,
          max_completion_tokens: 1600
        }),
        signal: AbortSignal.timeout(timeout)
      });
    } catch (cause) {
      const error = new Error(
        cause && cause.name === 'TimeoutError'
          ? 'OpenAI request timed out. Please try again.'
          : 'Could not connect to the OpenAI API. Please try again.'
      );
      error.statusCode = 502;
      error.cause = cause;
      throw error;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail = data && data.error && data.error.message;
      const error = new Error(
        detail || `OpenAI API request failed with status ${response.status}.`
      );
      error.statusCode = response.status === 401 ? 401 :
        response.status === 429 ? 429 :
        response.status >= 500 ? 502 : 400;
      throw error;
    }

    const content = data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content;

    let reply = '';
    if (typeof content === 'string') {
      reply = content.trim();
    } else if (Array.isArray(content)) {
      reply = content
        .filter(part => part && typeof part.text === 'string')
        .map(part => part.text)
        .join('\n')
        .trim();
    }

    if (!reply) {
      throw new Error('OpenAI returned an empty text response.');
    }

    return reply;
  }

  async generateChat(message, history = []) {
    if (typeof message !== 'string' || !message.trim()) {
      const error = new Error('A non-empty message is required.');
      error.statusCode = 400;
      throw error;
    }

    const safeHistory = Array.isArray(history)
      ? history.slice(-10).map(item => ({
          role: item && item.role === 'assistant' ? 'assistant' : 'user',
          content: String(item && item.content != null ? item.content : '').slice(0, 4000)
        })).filter(item => item.content.trim())
      : [];

    const systemMessage = {
      role: 'system',
      content:
        'You are ChatGPT, one of two collaborating AI engines inside Seller Dropshipping AI. ' +
        'Help with Indian ecommerce, dropshipping, product research, listings, pricing, ' +
        'profit margins, customer support, returns, marketing, business planning and technical ' +
        'troubleshooting. Reply in the same language as the user, including Bengali, Hindi or ' +
        'English. Be accurate, practical and transparent about uncertainty. Never claim that ' +
        'you placed an order, connected a marketplace, booked a courier, published content or ' +
        'changed account settings unless a real connected service confirms it. Never ask for ' +
        'passwords, API keys or sensitive customer information.'
    };

    return this.request([
      systemMessage,
      ...safeHistory,
      { role: 'user', content: message.trim().slice(0, 12000) }
    ]);
  }
}

module.exports = new OpenAIService();
