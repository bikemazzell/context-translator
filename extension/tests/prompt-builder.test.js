/**
 * Tests for prompt builder module
 */

import { describe, test, expect } from '@jest/globals';
import { buildUserPrompt, buildMessages } from '../background/prompt-builder.js';
import { SYSTEM_PROMPT } from '../shared/config.js';

describe('buildUserPrompt', () => {
  test('should build basic prompt', () => {
    const prompt = buildUserPrompt('hello', 'English', 'Spanish', null);

    expect(prompt).toContain('Translate this English text to Spanish');
    expect(prompt).toContain('hello');
  });

  test('should include context when provided', () => {
    const prompt = buildUserPrompt('hello', 'English', 'Spanish', 'greeting');

    expect(prompt).toContain('hello');
    expect(prompt).toContain('Context (for disambiguation only, do not translate this)');
    expect(prompt).toContain('greeting');
  });

  test('should not include context when null', () => {
    const prompt = buildUserPrompt('hello', 'English', 'Spanish', null);

    expect(prompt).not.toContain('Context:');
  });

  test('should sanitize text input', () => {
    const prompt = buildUserPrompt('  hello  \n\n  ', 'English', 'Spanish', null);

    expect(prompt).toContain('hello');
    expect(prompt).toContain('"hello"');
  });

  test('should sanitize context input', () => {
    const prompt = buildUserPrompt('hello', 'English', 'Spanish', '  greeting  ');

    expect(prompt).toContain('"greeting"');
    expect(prompt).toContain('Context (for disambiguation only, do not translate this)');
  });

  test('should handle different language pairs', () => {
    const prompt1 = buildUserPrompt('bonjour', 'French', 'English', null);
    const prompt2 = buildUserPrompt('hola', 'Spanish', 'German', null);

    expect(prompt1).toContain('Translate this French text to English');
    expect(prompt2).toContain('Translate this Spanish text to German');
  });

  test('should quote the text', () => {
    const prompt = buildUserPrompt('hello', 'English', 'Spanish', null);

    expect(prompt).toMatch(/"hello"/);
  });

  test('should quote the context', () => {
    const prompt = buildUserPrompt('hello', 'English', 'Spanish', 'greeting');

    expect(prompt).toContain('"greeting"');
    expect(prompt).toContain('Context (for disambiguation only, do not translate this)');
  });

  test('should handle empty context string', () => {
    const prompt = buildUserPrompt('hello', 'English', 'Spanish', '');

    expect(prompt).not.toContain('Context:');
  });

  test('should handle multi-word text', () => {
    const prompt = buildUserPrompt('hello world', 'English', 'Spanish', null);

    expect(prompt).toContain('"hello world"');
  });

  test('should handle multi-word context', () => {
    const prompt = buildUserPrompt('hello', 'English', 'Spanish', 'friendly greeting');

    expect(prompt).toContain('"friendly greeting"');
  });
});

describe('buildMessages', () => {
  test('should return array with system and user messages', () => {
    const messages = buildMessages('hello', 'English', 'Spanish', null);

    expect(Array.isArray(messages)).toBe(true);
    expect(messages).toHaveLength(2);
  });

  test('should have system message first', () => {
    const messages = buildMessages('hello', 'English', 'Spanish', null);

    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toBe(SYSTEM_PROMPT);
  });

  test('should have user message second', () => {
    const messages = buildMessages('hello', 'English', 'Spanish', null);

    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toContain('hello');
  });

  test('should include context in user message', () => {
    const messages = buildMessages('hello', 'English', 'Spanish', 'greeting');

    expect(messages[1].content).toContain('Context (for disambiguation only, do not translate this)');
    expect(messages[1].content).toContain('greeting');
  });

  test('should not include context when null', () => {
    const messages = buildMessages('hello', 'English', 'Spanish', null);

    expect(messages[1].content).not.toContain('Context:');
  });

  test('should create proper message structure', () => {
    const messages = buildMessages('hello', 'English', 'Spanish', null);

    messages.forEach(msg => {
      expect(msg).toHaveProperty('role');
      expect(msg).toHaveProperty('content');
      expect(typeof msg.role).toBe('string');
      expect(typeof msg.content).toBe('string');
    });
  });

  test('should handle different language pairs', () => {
    const messages1 = buildMessages('bonjour', 'French', 'English', null);
    const messages2 = buildMessages('hola', 'Spanish', 'German', null);

    expect(messages1[1].content).toContain('Translate this French text to English');
    expect(messages2[1].content).toContain('Translate this Spanish text to German');
  });

  test('should use same system prompt for all requests', () => {
    const messages1 = buildMessages('hello', 'English', 'Spanish', null);
    const messages2 = buildMessages('goodbye', 'French', 'German', null);

    expect(messages1[0].content).toBe(messages2[0].content);
    expect(messages1[0].content).toBe(SYSTEM_PROMPT);
  });

  test('should sanitize text in user message', () => {
    const messages = buildMessages('  hello  ', 'English', 'Spanish', null);

    expect(messages[1].content).toContain('hello');
    expect(messages[1].content).not.toMatch(/ {2}hello {2}/);
  });

  test('should sanitize context in user message', () => {
    const messages = buildMessages('hello', 'English', 'Spanish', '  greeting  ');

    expect(messages[1].content).toContain('greeting');
    expect(messages[1].content).not.toMatch(/ {2}greeting {2}/);
  });
});
