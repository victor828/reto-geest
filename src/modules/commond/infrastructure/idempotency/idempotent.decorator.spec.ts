import { Reflector } from '@nestjs/core';
import { Idempotent, IDEMPOTENT_METADATA_KEY } from './idempotent.decorator';

describe('Idempotent decorator', () => {
  it('sets the idempotent metadata key to true on the handler', () => {
    class Controller {
      @Idempotent()
      handler() {}
    }

    const reflector = new Reflector();
    const value = reflector.get<boolean>(IDEMPOTENT_METADATA_KEY, Controller.prototype.handler);

    expect(value).toBe(true);
  });

  it('leaves undecorated handlers without the metadata', () => {
    class Controller {
      handler() {}
    }

    const reflector = new Reflector();
    const value = reflector.get<boolean>(IDEMPOTENT_METADATA_KEY, Controller.prototype.handler);

    expect(value).toBeUndefined();
  });
});
