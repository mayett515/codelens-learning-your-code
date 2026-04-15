export function uid(): string {
  const hex = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 32; i++) {
    if (i === 8 || i === 12 || i === 16 || i === 20) id += '-';
    id += hex[Math.floor(Math.random() * 16)];
  }
  return id;
}
