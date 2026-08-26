import { Injectable } from '@nestjs/common';
import { InitUseCase } from 'src/modules/commond/application/use-cases/init.use-case';

@Injectable()
export class UsersDeleteUseCase implements InitUseCase {
  init(args: any): void {
    throw new Error('Method not implemented.');
  }
}
