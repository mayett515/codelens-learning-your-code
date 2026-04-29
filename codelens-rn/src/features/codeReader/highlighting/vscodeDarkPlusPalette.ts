export type TokenKind =
  | 'keyword'
  | 'string'
  | 'comment'
  | 'number'
  | 'identifier'
  | 'operator'
  | 'plain';

export const VSCODE_DARK_PLUS_PALETTE: Record<TokenKind, string> = {
  keyword: '#569CD6',
  string: '#CE9178',
  comment: '#6A9955',
  number: '#B5CEA8',
  identifier: '#D4D4D4',
  operator: '#D4D4D4',
  plain: '#D4D4D4',
};

export const PLAIN_TOKEN_COLOR = VSCODE_DARK_PLUS_PALETTE.plain;
