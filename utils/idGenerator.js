export function generatePaperId(sequence = 1) {
  const year = new Date().getFullYear();
  return `P-${year}-${String(sequence).padStart(5, '0')}`;
}
