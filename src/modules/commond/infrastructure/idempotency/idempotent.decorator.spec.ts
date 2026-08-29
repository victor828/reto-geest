import { Reflector } from '@nestjs/core';
import { Idempotent, IDEMPOTENT_METADATA_KEY } from './idempotent.decorator';

describe('Idempotent decorator', () => {
  it('sets default options (autoKeyFromBody: false) on the handler', () => {
    class Controller {
      @Idempotent()
      handler() {}
    }

    const reflector = new Reflector();
    const value = reflector.get(IDEMPOTENT_METADATA_KEY, Controller.prototype.handler);

    expect(value).toEqual({ autoKeyFromBody: false });
  });

  it('allows opting into autoKeyFromBody', () => {
    class Controller {
      @Idempotent({ autoKeyFromBody: true })
      handler() {}
    }

    const reflector = new Reflector();
    const value = reflector.get(IDEMPOTENT_METADATA_KEY, Controller.prototype.handler);

    expect(value).toEqual({ autoKeyFromBody: true });
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
