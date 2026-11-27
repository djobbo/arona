/**
 * A name-keyed collection of bot commands.
 *
 * Commands are stored by the name the platform sees, so adding a command with
 * an existing name replaces it. This mirrors how Discord application commands
 * are registered: the latest definition for a name wins.
 */
export class CommandRegistry<Command extends { readonly name: string }> {
  readonly #commands = new Map<string, Command>();

  get size(): number {
    return this.#commands.size;
  }

  add(command: Command): this {
    this.#commands.set(command.name, command);
    return this;
  }

  addAll(commands: Iterable<Command>): this {
    for (const command of commands) this.add(command);
    return this;
  }

  get(name: string): Command | undefined {
    return this.#commands.get(name);
  }

  has(name: string): boolean {
    return this.#commands.has(name);
  }

  remove(name: string): boolean {
    return this.#commands.delete(name);
  }

  list(): ReadonlyArray<Command> {
    return [...this.#commands.values()];
  }

  names(): ReadonlyArray<string> {
    return [...this.#commands.keys()];
  }

  clear(): void {
    this.#commands.clear();
  }

  [Symbol.iterator](): IterableIterator<Command> {
    return this.#commands.values();
  }
}
