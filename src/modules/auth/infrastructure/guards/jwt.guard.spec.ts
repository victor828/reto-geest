import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './jwt.guard';

describe('AuthGuard', () => {
  it('should be defined', () => {
    expect(new AuthGuard(new JwtService({}))).toBeDefined();
  });
});
