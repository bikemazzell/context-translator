export class ContextExtractor {
  extractContext(node: Node, windowSize: number): string {
    const textNode = this.findTextNode(node);
    if (!textNode || !textNode.textContent) {
      return '';
    }

    const fullText = textNode.textContent;
    const parent = textNode.parentElement;
    if (!parent) {
      return fullText;
    }

    const range = document.createRange();
    range.selectNodeContents(parent);

    const preCaretRange = range.cloneRange();
    preCaretRange.setEnd(textNode, 0);
    const offset = preCaretRange.toString().length;

    const startOffset = Math.max(0, offset - windowSize);
    const endOffset = Math.min(fullText.length, offset + windowSize);

    return fullText.substring(startOffset, endOffset).trim();
  }

  private findTextNode(node: Node): Text | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return node as Text;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      return walker.nextNode() as Text | null;
    }

    return null;
  }

  getTextAtPoint(x: number, y: number): { text: string; node: Node; range: Range } | null {
    let node: Node | null = null;
    let offset = 0;

    if ((document as any).caretRangeFromPoint) {
      const range = (document as any).caretRangeFromPoint(x, y);
      if (!range) {
        return null;
      }
      node = range.startContainer;
      offset = range.startOffset;
    } else if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(x, y);
      if (!position) {
        return null;
      }
      node = position.offsetNode;
      offset = position.offset;
    } else {
      console.error('Browser does not support caretRangeFromPoint or caretPositionFromPoint');
      return null;
    }

    if (!node) {
      return null;
    }

    const textContent = node.textContent;

    if (!textContent) {
      return null;
    }

    const wordInfo = this.extractWordAtOffset(textContent, offset);

    if (!wordInfo) {
      return null;
    }

    const range = document.createRange();
    range.setStart(node, wordInfo.start);
    range.setEnd(node, wordInfo.end);

    return { text: wordInfo.text, node, range };
  }

  private extractWordAtOffset(text: string, offset: number): { text: string; start: number; end: number } | null {
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
    if (!word) {
      return null;
    }

    return { text: word, start, end };
  }
}
