/** Invalidates async work after sign-out or an identity change. */
export class SessionGuard {
  private generation = 0;
  ticket() { return this.generation; }
  invalidate() { this.generation++; }
  current(ticket: number) { return ticket === this.generation; }
}
