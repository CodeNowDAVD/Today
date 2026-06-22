/** Parsea nombre de evento y líneas data: de un bloque SSE. */
export function parseSseEventBlock(block: string): { event: string; data: string | null } {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  return {
    event,
    data: dataLines.length > 0 ? dataLines.join("\n") : null,
  };
}
