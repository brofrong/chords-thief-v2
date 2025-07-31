function formatNumberWithLeadingZeros(
  num: number,
  totalLength: number = 4,
): string {
  return num.toString().padStart(totalLength, "0");
}

async function* generateNumbers(
  start: number = 0,
  end: number = 10,
  delay: number = 1000,
): AsyncIterable<string> {
  for (let i = start; i <= end; i++) {
    yield `${formatNumberWithLeadingZeros(i)}\n`;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export { generateNumbers };
