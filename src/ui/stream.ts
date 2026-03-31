export class StreamRenderer {
  private buffer = ''

  write(chunk: string): void {
    this.buffer += chunk
    process.stdout.write(chunk)
  }

  clear(): void {
    this.buffer = ''
  }

  getContent(): string {
    return this.buffer
  }

  newline(): void {
    process.stdout.write('\n')
  }
}
