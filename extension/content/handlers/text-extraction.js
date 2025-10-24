/**
 * Text extraction utilities
 * Extracts words and surrounding context from DOM
 */

/**
 * Extract word at click coordinates
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {{text: string, node: Node, range: Range}|null}
 */
export function extractWordAtPoint(x, y) {
  let node = null;
  let offset = 0;

  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    if (!range) return null;
    node = range.startContainer;
    offset = range.startOffset;
  } else if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);
    if (!position) return null;
    node = position.offsetNode;
    offset = position.offset;
  } else {
    return null;
  }

  if (!node) return null;

  const textContent = node.textContent;
  if (!textContent) return null;

  const wordInfo = extractWordAtOffset(textContent, offset);
  if (!wordInfo) return null;

  const range = document.createRange();
  range.setStart(node, wordInfo.start);
  range.setEnd(node, wordInfo.end);

  return { text: wordInfo.text, node, range };
}

/**
 * Extract word at given offset in text
 * @param {string} text - Text to search
 * @param {number} offset - Character offset
 * @returns {{text: string, start: number, end: number}|null}
 */
export function extractWordAtOffset(text, offset) {
  const wordBoundary = /[\s.,!?;:()\[\]{}"'«»„""'']/;

  let start = offset;
  while (start > 0 && !wordBoundary.test(text[start - 1])) {
    start--;
  }

  let end = offset;
  while (end < text.length && !wordBoundary.test(text[end])) {
    end++;
  }

  const word = text.substring(start, end).trim();
  if (!word) return null;

  return { text: word, start, end };
}

/**
 * Check if element should be excluded from text extraction
 * @param {Element} element - Element to check
 * @returns {boolean}
 */
function shouldExcludeElement(element) {
  if (!element || !element.tagName) return true;

  const tag = element.tagName.toLowerCase();

  // Exclude script, style, meta, and other non-content tags
  const excludedTags = ['script', 'style', 'meta', 'link', 'noscript', 'iframe', 'object', 'embed'];
  if (excludedTags.includes(tag)) return true;

  // Exclude hidden elements
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return true;

  // Exclude input fields that might contain sensitive data
  if (tag === 'input') {
    const type = element.getAttribute('type')?.toLowerCase();
    const sensitiveTypes = ['password', 'hidden', 'email', 'tel', 'number', 'search'];
    if (!type || sensitiveTypes.includes(type)) return true;
  }

  // Exclude textarea (might contain sensitive data)
  if (tag === 'textarea') return true;

  return false;
}

/**
 * Extract context around a node
 * @param {Node} node - Text node or element
 * @param {number} windowSize - Size of context window (total chars before + after)
 * @returns {string}
 */
export function extractContext(node, windowSize) {
  console.debug('[ContextTranslator] extractContext called with windowSize:', windowSize);

  const textNode = node.nodeType === Node.TEXT_NODE ? node : findTextNode(node);
  if (!textNode || !textNode.textContent) {
    console.debug('[ContextTranslator] No text node found');
    return '';
  }

  // Walk up the DOM tree to find a parent with substantial text
  let element = textNode.parentElement;
  let fullText = '';
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts && element) {
    // Skip excluded elements
    if (shouldExcludeElement(element)) {
      console.debug(`[ContextTranslator] Skipping excluded element: ${element.tagName}`);
      element = element.parentElement;
      attempts++;
      continue;
    }

    fullText = element.textContent || element.innerText || '';
    console.debug(`[ContextTranslator] Attempt ${attempts + 1}: element tag=${element.tagName}, text length=${fullText.length}`);

    // If we have enough text for a good context window, stop
    if (fullText.length >= windowSize * 1.5) {
      break;
    }

    element = element.parentElement;
    attempts++;
  }

  if (!element || !fullText) {
    console.debug('[ContextTranslator] No element or text found, using text node content');
    let context = textNode.textContent || '';

    // Normalize whitespace
    context = context.replace(/\s+/g, ' ');

    // Strip emojis and special characters
    context = context.replace(/[^\p{L}\p{N}\s]/gu, '');

    return context.trim();
  }

  console.debug('[ContextTranslator] Using element:', element.tagName, 'Full text length:', fullText.length);

  // Find where the text node's content is in the full text
  const textNodeContent = textNode.textContent;
  const startOffset = fullText.indexOf(textNodeContent);

  if (startOffset === -1) {
    console.debug('[ContextTranslator] Text node content not found in parent, using partial');
    return fullText.substring(0, windowSize);
  }

  // Calculate context window around the text node
  // The windowSize parameter represents a target size, but we try to include the text node content
  const halfWindow = Math.floor(windowSize / 2);
  const maxExtraction = windowSize * 2;

  let contextStart, contextEnd;

  // Include the text node plus some padding, preferring to start from the beginning
  contextStart = Math.max(0, startOffset - halfWindow);
  contextEnd = Math.min(fullText.length, startOffset + textNodeContent.length + halfWindow);

  // If the extraction would be too large, we need to limit it
  if (contextEnd - contextStart > maxExtraction) {
    // For very large text nodes, try to extract from the middle
    if (textNodeContent.length > maxExtraction * 1.5) {
      const textMidpoint = startOffset + Math.floor(textNodeContent.length / 2);
      contextStart = Math.max(0, textMidpoint - halfWindow);
      contextEnd = Math.min(fullText.length, contextStart + maxExtraction);
    } else {
      // Otherwise, just cap from the start
      contextEnd = contextStart + maxExtraction;
    }
  }

  console.debug('[ContextTranslator] Context extraction:', {
    startOffset,
    textNodeLength: textNodeContent.length,
    halfWindow,
    windowSize,
    contextStart,
    contextEnd,
    extractedLength: contextEnd - contextStart
  });

  let context = fullText.substring(contextStart, contextEnd).trim();

  // Normalize whitespace: replace all whitespace chars with single spaces
  context = context.replace(/\s+/g, ' ');

  // Strip emojis and special characters - keep only letters, numbers, and spaces
  context = context.replace(/[^\p{L}\p{N}\s]/gu, '');

  console.debug('[ContextTranslator] Extracted context length:', context.length);
  console.debug('[ContextTranslator] Normalized context:', context);

  return context;
}

/**
 * Extract context around a range (for selections)
 * @param {Range} range - Selection range
 * @param {number} windowSize - Size of context window (total chars before + after)
 * @returns {string}
 */
export function extractContextFromRange(range, windowSize) {
  console.debug('[ContextTranslator] extractContextFromRange called with windowSize:', windowSize);

  if (!range) {
    console.debug('[ContextTranslator] No range provided');
    return '';
  }

  // Get the common ancestor that contains the entire selection
  const container = range.commonAncestorContainer;
  console.debug('[ContextTranslator] Container:', container, 'nodeType:', container.nodeType);

  // Walk up the DOM tree to find a parent with substantial text
  // This ensures we get enough context even for small elements
  let element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
  let fullText = '';
  let attempts = 0;
  const maxAttempts = 5; // Don't go too far up the tree

  while (attempts < maxAttempts && element) {
    // Skip excluded elements
    if (shouldExcludeElement(element)) {
      console.debug(`[ContextTranslator] Skipping excluded element: ${element.tagName}`);
      element = element.parentElement;
      attempts++;
      continue;
    }

    fullText = element.textContent || element.innerText || '';
    console.debug(`[ContextTranslator] Attempt ${attempts + 1}: element tag=${element.tagName}, text length=${fullText.length}`);

    // If we have enough text for a good context window, stop
    if (fullText.length >= windowSize * 1.5) {
      break;
    }

    element = element.parentElement;
    attempts++;
  }

  if (!element || !fullText) {
    console.debug('[ContextTranslator] No element or text found');
    return '';
  }

  console.debug('[ContextTranslator] Using element:', element.tagName, 'Full text length:', fullText.length);

  // Get the selected text to find its position
  const selectedText = range.toString().trim();
  console.debug('[ContextTranslator] Selected text:', selectedText);

  if (!selectedText) {
    console.debug('[ContextTranslator] No selected text');
    return '';
  }

  // Find where the selection is in the full text
  const selectionIndex = fullText.indexOf(selectedText);
  console.debug('[ContextTranslator] Selection index:', selectionIndex, 'in text of length:', fullText.length);

  if (selectionIndex === -1) {
    console.debug('[ContextTranslator] Selection not found in full text, returning partial');
    return fullText.substring(0, windowSize);
  }

  // Calculate how many chars before and after (split the window in half)
  const halfWindow = Math.floor(windowSize / 2);
  const contextStart = Math.max(0, selectionIndex - halfWindow);
  const contextEnd = Math.min(fullText.length, selectionIndex + selectedText.length + halfWindow);

  console.debug('[ContextTranslator] Context extraction:', {
    selectionIndex,
    selectedTextLength: selectedText.length,
    halfWindow,
    contextStart,
    contextEnd,
    beforeChars: selectionIndex - contextStart,
    afterChars: contextEnd - (selectionIndex + selectedText.length)
  });

  let context = fullText.substring(contextStart, contextEnd).trim();

  // Normalize whitespace: replace all whitespace chars with single spaces
  context = context.replace(/\s+/g, ' ');

  // Strip emojis and special characters - keep only letters, numbers, and spaces
  context = context.replace(/[^\p{L}\p{N}\s]/gu, '');

  console.debug('[ContextTranslator] Extracted context length:', context.length);
  console.debug('[ContextTranslator] Normalized context:', context);

  return context;
}

/**
 * Find first text node within element
 * @param {Node} node - Node to search
 * @returns {Node|null}
 */
function findTextNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return node;
  if (node.nodeType === Node.ELEMENT_NODE) {
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (textNode) => {
          // Skip text nodes inside excluded elements
          let parent = textNode.parentElement;
          while (parent) {
            if (shouldExcludeElement(parent)) {
              return NodeFilter.FILTER_REJECT;
            }
            parent = parent.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    return walker.nextNode();
  }
  return null;
}
