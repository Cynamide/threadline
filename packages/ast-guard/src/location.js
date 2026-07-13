export function getLineColumn(source, index) {
  const safeIndex = Math.max(0, Math.min(index, source.length));
  let line = 1;
  let column = 1;

  for (let cursor = 0; cursor < safeIndex; cursor += 1) {
    if (source[cursor] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
}

export function makeViolation({ code, severity = 'error', filePath, line = 1, column = 1, message }) {
  return { code, severity, filePath, line, column, message };
}

export function pathLineColumn(filePath) {
  return { filePath, line: 1, column: 1 };
}
