'use strict';

require('dotenv').config();

const openAI = require('./openaiService');
const googleAI = require('./aiStudioService');

/**
 * Fusion Engine:
 * 1. Gets an independent answer from OpenAI and Gemini.
 * 2. Asks each available engine to review the other engine's answer.
 * 3. Uses OpenAI to synthesize one final answer (Gemini is the fallback).
 *
 * The public result includes `reply`, which is compatible with the existing
 * frontend's usual /api/ai/chat response shape. The server must explicitly
 * expose this engine through an authenticated API route before the UI can use it.
 */
class FusionEngine {
  isConfigured() {
    return openAI.isConfigured() && googleAI.isConfigured();
  }

  getStatus() {
    const openAIReady = openAI.isConfigured();
    const geminiReady = googleAI.isConfigured();

    return {
      configured: openAIReady && geminiReady,
      openAI: {
        configured: openAIReady,
        model: openAI.model()
      },
      gemini: {
        configured: geminiReady,
        model: typeof googleAI.model === 'function' ? googleAI.model() : null
      }
    };
  }

  async askForReview(reviewer, originalQuestion, ownAnswer, otherAnswer, reviewerName) {
    const prompt =
      'You are acting as a fact-checking reviewer in a two-AI collaboration. ' +
      'Review the other AI answer against the user question. Identify factual errors, ' +
      'unsupported claims, missing important caveats, and any disagreement with your own ' +
      'analysis. Do not rewrite the whole answer. Return concise review notes. If you find ' +
      'no material issue, say so. Reply in the same language as the user.\n\n' +
      'USER QUESTION:\n' + originalQuestion.slice(0, 10000) +
      '\n\nYOUR INDEPENDENT ANSWER (' + reviewerName + '):\n' +
      ownAnswer.slice(0, 9000) +
      '\n\nOTHER AI ANSWER TO REVIEW:\n' + otherAnswer.slice(0, 9000);

    return reviewer.generateChat(prompt, []);
  }

  async synthesize(originalQuestion, openAIAnswer, geminiAnswer, openAIReview, geminiReview) {
    const prompt =
      'You are the final response composer for Fusion AI, a collaboration between ChatGPT and ' +
      'Google Gemini inside Seller Dropshipping AI. Produce ONE clear, useful answer to the user. ' +
      'Compare both independent answers and both review notes. Correct errors, resolve differences ' +
      'where evidence permits, and clearly state uncertainty where it cannot be resolved. Do not ' +
      'invent facts or claim actions were completed. Reply in the same language as the original ' +
      'question. Do not mention internal API keys or expose hidden reasoning. Provide the answer, ' +
      'not a description of the collaboration.\n\n' +
      'USER QUESTION:\n' + originalQuestion.slice(0, 10000) +
      '\n\nCHATGPT ANSWER:\n' + openAIAnswer.slice(0, 9000) +
      '\n\nGEMINI ANSWER:\n' + geminiAnswer.slice(0, 9000) +
      '\n\nCHATGPT REVIEW OF GEMINI:\n' + (openAIReview || 'Review unavailable.') +
      '\n\nGEMINI REVIEW OF CHATGPT:\n' + (geminiReview || 'Review unavailable.');

    // Prefer OpenAI for final synthesis; if unavailable, use Gemini.
    try {
      return {
        reply: await openAI.generateChat(prompt, []),
        finalProvider: 'OpenAI',
        finalModel: openAI.model()
      };
    } catch (openAIError) {
      try {
        return {
          reply: await googleAI.generateChat(prompt, []),
          finalProvider: 'Google Gemini',
          finalModel: typeof googleAI.model === 'function' ? googleAI.model() : null,
          synthesisFallback: true
        };
      } catch (geminiError) {
        const error = new Error(
          'Both AI engines produced answers, but the final combined answer could not be generated. ' +
          'Please try again.'
        );
        error.statusCode = 502;
        error.cause = geminiError || openAIError;
        throw error;
      }
    }
  }

  async generateFusionChat(message, history = []) {
    if (typeof message !== 'string' || !message.trim()) {
      const error = new Error('A non-empty message is required.');
      error.statusCode = 400;
      throw error;
    }

    const openAIReady = openAI.isConfigured();
    const geminiReady = googleAI.isConfigured();

    if (!openAIReady && !geminiReady) {
      const error = new Error(
        'Fusion AI is not configured. Add OPENAI_API_KEY and GEMINI_API_KEY to Render Environment Variables.'
      );
      error.statusCode = 503;
      throw error;
    }

    // Graceful single-provider mode keeps the assistant usable during setup.
    if (!openAIReady || !geminiReady) {
      const provider = openAIReady ? openAI : googleAI;
      const providerName = openAIReady ? 'OpenAI' : 'Google Gemini';
      const reply = await provider.generateChat(message, history);

      return {
        success: true,
        reply,
        mode: 'single-provider-fallback',
        provider: providerName,
        providers: {
          openAI: openAIReady,
          gemini: geminiReady
        },
        verification: {
          performed: false,
          reason: 'Both API providers must be configured for dual-AI verification.'
        }
      };
    }

    const [openAIResult, geminiResult] = await Promise.allSettled([
      openAI.generateChat(message, history),
      googleAI.generateChat(message, history)
    ]);

    const openAIAnswer = openAIResult.status === 'fulfilled' ? openAIResult.value : null;
    const geminiAnswer = geminiResult.status === 'fulfilled' ? geminiResult.value : null;

    if (!openAIAnswer && !geminiAnswer) {
      const error = new Error(
        'Both OpenAI and Gemini requests failed. Check API keys, model access, billing and usage limits.'
      );
      error.statusCode = 502;
      throw error;
    }

    // If one provider fails at runtime, return the successful answer rather than fail the chat.
    if (!openAIAnswer || !geminiAnswer) {
      return {
        success: true,
        reply: openAIAnswer || geminiAnswer,
        mode: 'single-provider-fallback',
        provider: openAIAnswer ? 'OpenAI' : 'Google Gemini',
        providers: {
          openAI: Boolean(openAIAnswer),
          gemini: Boolean(geminiAnswer)
        },
        verification: {
          performed: false,
          reason: 'One provider did not respond successfully.'
        }
      };
    }

    // Cross-review is best-effort: a review failure does not discard either answer.
    const [openAIReviewResult, geminiReviewResult] = await Promise.allSettled([
      this.askForReview(openAI, message, openAIAnswer, geminiAnswer, 'ChatGPT'),
      this.askForReview(googleAI, message, geminiAnswer, openAIAnswer, 'Gemini')
    ]);

    const openAIReview = openAIReviewResult.status === 'fulfilled'
      ? openAIReviewResult.value
      : null;
    const geminiReview = geminiReviewResult.status === 'fulfilled'
      ? geminiReviewResult.value
      : null;

    const final = await this.synthesize(
      message,
      openAIAnswer,
      geminiAnswer,
      openAIReview,
      geminiReview
    );

    return {
      success: true,
      reply: final.reply,
      mode: 'fusion',
      provider: 'ChatGPT + Google Gemini',
      models: {
        openAI: openAI.model(),
        gemini: typeof googleAI.model === 'function' ? googleAI.model() : null,
        final: final.finalModel
      },
      finalProvider: final.finalProvider,
      providers: {
        openAI: true,
        gemini: true
      },
      verification: {
        performed: true,
        openAIReviewedGemini: Boolean(openAIReview),
        geminiReviewedOpenAI: Boolean(geminiReview)
      }
    };
  }
}

module.exports = new FusionEngine();
