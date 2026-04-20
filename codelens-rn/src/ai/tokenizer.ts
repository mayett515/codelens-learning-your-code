import vocab from './vocab.json';

const vocabMap: Record<string, number> = vocab;
const UNK_ID = vocabMap['[UNK]'];
const CLS_ID = vocabMap['[CLS]'];
const SEP_ID = vocabMap['[SEP]'];
const PAD_ID = vocabMap['[PAD]'];
const MAX_INPUT_CHARS_PER_WORD = 100;

export function tokenize(text: string): number[] {
  const ids: number[] = [CLS_ID];

  // 1. Basic normalization
  const normalized = text.toLowerCase();
  
  // 2. Split into words and punctuation
  // This Regex keeps words, numbers, and splits out individual punctuation marks.
  const words = normalized.match(/[\w\u00C0-\u00FF]+|[^\w\s\u00C0-\u00FF]/g) || [];

  for (const word of words) {
    if (word.length > MAX_INPUT_CHARS_PER_WORD) {
      ids.push(UNK_ID);
      continue;
    }

    let start = 0;
    let isBad = false;
    const subTokens: number[] = [];

    // WordPiece algorithm: Find longest substring matching the vocab
    while (start < word.length) {
      let end = word.length;
      let curId: number | undefined;

      while (start < end) {
        const substr = word.slice(start, end);
        const token = start > 0 ? `##${substr}` : substr;
        curId = vocabMap[token];

        if (curId !== undefined) {
          break;
        }
        end -= 1;
      }

      if (curId === undefined) {
        isBad = true;
        break;
      }

      subTokens.push(curId);
      start = end;
    }

    if (isBad) {
      ids.push(UNK_ID);
    } else {
      ids.push(...subTokens);
    }
  }

  ids.push(SEP_ID);
  
  return ids;
}
