import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class InitUseCase {
  abstract init(...args: any);
}
