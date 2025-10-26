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

  // Ensure we have a text node
  if (node.nodeType !== Node.TEXT_NODE) {
    console.warn('[ContextTranslator] Node is not a text node:', node.nodeType);
    return null;
  }

  const textContent = node.textContent;
  if (!textContent) return null;

  // Clamp the offset to be within the text content
  const clampedOffset = Math.max(0, Math.min(offset, textContent.length - 1));

  const wordInfo = extractWordAtOffset(textContent, clampedOffset);
  if (!wordInfo) return null;

  // For text nodes, use node.length (which gives the actual character data length)
  // This is critical for nodes with HTML entities
  const nodeLength = node.length;

  if (!nodeLength || nodeLength === 0) {
    console.warn('[ContextTranslator] Node has no length');
    return null;
  }

  // Validate that the offsets are within the node's actual data length
  if (wordInfo.start < 0 || wordInfo.end > nodeLength || wordInfo.start >= wordInfo.end) {
    console.warn('[ContextTranslator] Invalid word offsets:', {
      start: wordInfo.start,
      end: wordInfo.end,
      nodeLength,
      text: wordInfo.text,
      textContent: textContent.substring(0, 50)
    });
    return null;
  }

  try {
    const range = document.createRange();
    range.setStart(node, wordInfo.start);
    range.setEnd(node, wordInfo.end);

    // Verify the range was created successfully
    if (range.startOffset !== wordInfo.start || range.endOffset !== wordInfo.end) {
      console.warn('[ContextTranslator] Range offsets mismatch:', {
        expected: { start: wordInfo.start, end: wordInfo.end },
        actual: { start: range.startOffset, end: range.endOffset }
      });
      return null;
    }

    return { text: wordInfo.text, node, range };
  } catch (error) {
    console.error('[ContextTranslator] Failed to create range:', error, {
      start: wordInfo.start,
      end: wordInfo.end,
      nodeLength,
      text: wordInfo.text,
      nodeType: node.nodeType,
      textContent: textContent.substring(0, 50)
    });
    return null;
  }
}

/**
 * Extract word at given offset in text
 * @param {string} text - Text to search
 * @param {number} offset - Character offset
 * @returns {{text: string, start: number, end: number}|null}
 */
export function extractWordAtOffset(text, offset) {
  if (!text || offset < 0 || offset > text.length) {
    return null;
  }

  const wordBoundary = /[\s.,!?;:()\[\]{}"'«»„""'']/;

  let start = Math.min(offset, text.length);
  while (start > 0 && !wordBoundary.test(text[start - 1])) {
    start--;
  }

  let end = Math.min(offset, text.length);
  while (end < text.length && !wordBoundary.test(text[end])) {
    end++;
  }

  // Ensure bounds are valid
  start = Math.max(0, start);
  end = Math.min(text.length, end);

  if (start >= end) {
    return null;
  }

  const word = text.substring(start, end).trim();
  if (!word) return null;

  // Adjust offsets if trimming removed leading/trailing whitespace
  const leadingWhitespace = text.substring(start, end).length - text.substring(start, end).trimStart().length;
  const trailingWhitespace = text.substring(start, end).length - text.substring(start, end).trimEnd().length;

  start += leadingWhitespace;
  end -= trailingWhitespace;

  // Final validation
  if (start < 0 || end > text.length || start >= end) {
    return null;
  }

  return { text: word, start, end };
}

/**
 * Check if element should be excluded from text extraction
 * @param {Element} element - Element to check
 * @returns {boolean}
 */
function shouldExcludeElement(element) {
  if (!element) return true;
  if (!element.tagName) return false; // Text nodes and other non-elements should not be excluded by this function

  const tag = element.tagName.toLowerCase();

  // Exclude script, style, meta, and other non-content tags
  const excludedTags = ['script', 'style', 'meta', 'link', 'noscript', 'iframe', 'object', 'embed'];
  if (excludedTags.includes(tag)) return true;

  // Exclude inline translation elements (our own UI)
  if (element.classList && element.classList.contains('ct-inline-translation')) return true;

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
 * Extract text content from an element, excluding inline translations
 * @param {Element} element - Element to extract text from
 * @returns {string}
 */
function getTextContentExcludingTranslations(element) {
  if (!element) return '';

  const textParts = [];

  // Recursively walk through child nodes
  function collectText(node) {
    if (!node) return;

    // Skip excluded elements and their children
    if (node.nodeType === Node.ELEMENT_NODE && shouldExcludeElement(node)) {
      return;
    }

    // Collect text from text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      textParts.push(node.textContent);
      return;
    }

    // Recursively process child nodes
    if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of node.childNodes) {
        collectText(child);
      }
    }
  }

  collectText(element);

  return textParts.join('');
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
  let bestElement = null;
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

    const currentText = getTextContentExcludingTranslations(element);
    console.debug(`[ContextTranslator] Attempt ${attempts + 1}: element tag=${element.tagName}, text length=${currentText.length}`);

    // Keep track of the best element we've found so far
    if (currentText.length > fullText.length) {
      fullText = currentText;
      bestElement = element;
    }

    // If we have enough text for a good context window, stop
    if (fullText.length >= windowSize * 1.5) {
      break;
    }

    element = element.parentElement;
    attempts++;
  }

  // Use the best element we found, even if it didn't meet the threshold
  element = bestElement;

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

    fullText = getTextContentExcludingTranslations(element);
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
