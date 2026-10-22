export class CliError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly file?: string,
  ) {
    super(message);
  }
}
export class BatchError extends Error {
  constructor(
    public readonly index: number,
    public readonly cause: unknown,
  ) {
    super('Batch command failed');
  }
}
