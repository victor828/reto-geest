import {
  BadRequestException,
  ForbiddenException,
  Global,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

@Global()
@Injectable()
export class ErrorsUseCase {
  static setError(error: any) {
    switch (error.status) {
      case 400:
        throw new BadRequestException(error.message);
      case 401:
        throw new UnauthorizedException(error.message);
      case 403:
        throw new ForbiddenException(error.message);
      case 404:
        throw new NotFoundException(error.message);
      case 500:
        throw new InternalServerErrorException(error.message);
      default:
        throw new Error(`Error ${error.status}: ${error.message}`);
    }
  }
}
