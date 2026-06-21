interface SpanInfo {
  text: string;
  startTime: number;
  endTime: number;
  hasTrailingSpace: boolean;
}

export interface ParsedWord {
  text: string;
  startTime: number;
  endTime: number;
}

export interface ParsedLine {
  text: string;
  startTime: number;
  words: ParsedWord[];
  agent?: string;
  isBackground: boolean;
  backgroundLines: ParsedLine[];
}

function parseTime(timeStr: string): number {
  try {
    if (timeStr.includes(":")) {
      const parts = timeStr.split(":");
      if (parts.length === 2) {
        return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
      }
      if (parts.length === 3) {
        return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
      }
    }
    return parseFloat(timeStr) || 0;
  } catch {
    return 0;
  }
}

function getAttr(el: Element, localName: string): string {
  const nsVal = el.getAttributeNS("http://www.w3.org/ns/ttml#metadata", localName);
  if (nsVal) return nsVal;
  const prefixed = el.getAttribute(`ttm:${localName}`);
  if (prefixed) return prefixed;
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (attr.name === localName || attr.name.endsWith(`:${localName}`)) {
      return attr.value;
    }
  }
  return "";
}

function mergeSpansIntoWords(spanInfos: SpanInfo[]): ParsedWord[] {
  if (spanInfos.length === 0) return [];

  const words: ParsedWord[] = [];
  let currentText = spanInfos[0].text;
  let currentStartTime = spanInfos[0].startTime;
  let currentEndTime = spanInfos[0].endTime;

  for (let i = 1; i < spanInfos.length; i++) {
    const prevSpan = spanInfos[i - 1];
    const span = spanInfos[i];

    if (prevSpan.hasTrailingSpace) {
      words.push({
        text: currentText.trim(),
        startTime: currentStartTime,
        endTime: currentEndTime,
      });
      currentText = span.text;
      currentStartTime = span.startTime;
      currentEndTime = span.endTime;
    } else {
      currentText += span.text;
      currentEndTime = span.endTime;
    }
  }

  if (currentText.trim()) {
    words.push({
      text: currentText.trim(),
      startTime: currentStartTime,
      endTime: currentEndTime,
    });
  }

  return words;
}

function getDirectTextContent(element: Element): string {
  let text = "";
  for (let i = 0; i < element.childNodes.length; i++) {
    const node = element.childNodes[i];
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const role = getAttr(el, "role");
      if (role !== "x-bg" && role !== "x-translation" && role !== "x-roman") {
        if (el.tagName.toLowerCase() === "span") {
          text += el.textContent || "";
        }
      }
    }
  }
  return text;
}

function parseBackgroundSpan(span: Element, parentStartTime: number): ParsedLine | null {
  const bgBegin = span.getAttribute("begin");
  const bgEnd = span.getAttribute("end");
  const bgStartTime = bgBegin ? parseTime(bgBegin) : parentStartTime;

  const spanInfos: SpanInfo[] = [];

  for (let j = 0; j < span.childNodes.length; j++) {
    const node = span.childNodes[j];
    if (node.nodeType === Node.ELEMENT_NODE) {
      const innerSpan = node as Element;
      if (innerSpan.tagName.toLowerCase() === "span") {
        const role = getAttr(innerSpan, "role");
        if (role === "x-translation" || role === "x-roman") continue;

        const wordBegin = innerSpan.getAttribute("begin");
        const wordEnd = innerSpan.getAttribute("end");
        const wordText = (innerSpan.textContent || "").trim();

        if (wordText && wordBegin && wordEnd) {
          const nextSibling = node.nextSibling;
          const hasTrailingSpace =
            nextSibling?.nodeType === Node.TEXT_NODE &&
            /\s/.test(nextSibling.textContent || "");

          spanInfos.push({
            text: wordText,
            startTime: parseTime(wordBegin),
            endTime: parseTime(wordEnd),
            hasTrailingSpace,
          });
        }
      }
    }
  }

  const words = mergeSpansIntoWords(spanInfos);
  const lineText = words.map((w) => w.text).join(" ");
  const finalText = lineText || getDirectTextContent(span).trim();

  if (!finalText) return null;

  return {
    text: finalText,
    startTime: bgStartTime,
    words,
    isBackground: true,
    backgroundLines: [],
  };
}

export function parseTTML(ttml: string): ParsedLine[] {
  const lines: ParsedLine[] = [];
  const parser = new DOMParser();
  let doc: Document;

  try {
    doc = parser.parseFromString(ttml, "text/xml");
  } catch {
    return [];
  }

  const pElements = doc.getElementsByTagName("p");

  for (let i = 0; i < pElements.length; i++) {
    const pElement = pElements[i];
    const begin = pElement.getAttribute("begin");
    if (!begin) continue;

    const startTime = parseTime(begin);
    const spanInfos: SpanInfo[] = [];
    const backgroundLines: ParsedLine[] = [];
    const agent = getAttr(pElement, "agent") || undefined;

    for (let j = 0; j < pElement.childNodes.length; j++) {
      const node = pElement.childNodes[j];
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      const span = node as Element;
      if (span.tagName.toLowerCase() !== "span") continue;

      const role = getAttr(span, "role");

      if (role === "x-bg") {
        const bgLine = parseBackgroundSpan(span, startTime);
        if (bgLine) backgroundLines.push(bgLine);
        continue;
      }

      if (role === "x-translation" || role === "x-roman") continue;

      const wordBegin = span.getAttribute("begin");
      const wordEnd = span.getAttribute("end");
      const wordText = (span.textContent || "").trim();

      if (wordText && wordBegin && wordEnd) {
        const nextSibling = node.nextSibling;
        const hasTrailingSpace =
          nextSibling?.nodeType === Node.TEXT_NODE &&
          /\s/.test(nextSibling.textContent || "");

        spanInfos.push({
          text: wordText,
          startTime: parseTime(wordBegin),
          endTime: parseTime(wordEnd),
          hasTrailingSpace,
        });
      }
    }

    const words = mergeSpansIntoWords(spanInfos);
    const lineText = words.map((w) => w.text).join(" ");
    const finalText = lineText || getDirectTextContent(pElement).trim();

    if (finalText) {
      lines.push({
        text: finalText,
        startTime,
        words,
        agent,
        isBackground: false,
        backgroundLines,
      });
    }
  }

  return lines;
}

export function toLRC(lines: ParsedLine[]): string {
  let result = "";

  for (const line of lines) {
    const timeMs = Math.round(line.startTime * 1000);
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    const centiseconds = Math.floor((timeMs % 1000) / 10);

    const agentPrefix = line.agent ? `{agent:${line.agent}}` : "";

    result += `[${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}]${agentPrefix}${line.text}\n`;

    if (line.words.length > 0) {
      const wordsData = line.words
        .map((w) => `${w.text}:${w.startTime}:${w.endTime}`)
        .join("|");
      result += `<${wordsData}>\n`;
    }

    for (const bgLine of line.backgroundLines) {
      const bgTimeMs = Math.round(bgLine.startTime * 1000);
      const bgMinutes = Math.floor(bgTimeMs / 60000);
      const bgSeconds = Math.floor((bgTimeMs % 60000) / 1000);
      const bgCentiseconds = Math.floor((bgTimeMs % 1000) / 10);

      result += `[${String(bgMinutes).padStart(2, "0")}:${String(bgSeconds).padStart(2, "0")}.${String(bgCentiseconds).padStart(2, "0")}]{bg}${bgLine.text}\n`;

      if (bgLine.words.length > 0) {
        const bgWordsData = bgLine.words
          .map((w) => `${w.text}:${w.startTime}:${w.endTime}`)
          .join("|");
        result += `<${bgWordsData}>\n`;
      }
    }
  }

  return result;
}
