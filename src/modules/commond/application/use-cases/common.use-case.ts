import { Injectable } from '@nestjs/common';

@Injectable()
export class CommonUseCase {
  sum(a: number, b: number): number {
    return a + b;
  }
}
