export function buildDinosaurAlt(dinosaurName, funFact) {
  const name = dinosaurName ? dinosaurName.trim() : '';
  const fact = funFact ? funFact.trim() : '';

  if (!name) {
    return '';
  }

  if (!fact) {
    return `Ilustración de un ${name}`;
  }

  return `Ilustración de un ${name}. Dato curioso: ${fact}`;
}
